import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';

function isTrueInput(name) {
  return (core.getInput(name) || '').toLowerCase() === 'true';
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => {
    if (controller) {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {})
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runPreviewSecurityChecks(previewUrl, timeoutMs) {
  const report = {
    finalUrl: null,
    items: []
  };

  const addItem = (label, status, details) => {
    report.items.push({ label, status, details });
  };

  addItem(
    'HTTPS',
    previewUrl.startsWith('https://') ? 'pass' : 'warn',
    previewUrl.startsWith('https://') ? 'preview URL uses HTTPS' : 'preview URL does not use HTTPS'
  );

  let previewOrigin;
  try {
    previewOrigin = new URL(previewUrl).origin;
  } catch (error) {
    addItem('Preview URL', 'info', 'check unavailable: invalid preview URL');
    return report;
  }

  let previewResponse;
  try {
    const headResponse = await fetchWithTimeout(previewUrl, { method: 'HEAD' }, timeoutMs);
    if (headResponse.status === 405) {
      previewResponse = await fetchWithTimeout(previewUrl, { method: 'GET' }, timeoutMs);
    } else {
      previewResponse = headResponse;
    }
  } catch (error) {
    try {
      previewResponse = await fetchWithTimeout(previewUrl, { method: 'GET' }, timeoutMs);
    } catch (fallbackError) {
      addItem('Reachability', 'info', 'check unavailable: preview URL could not be reached');
    }
  }

  if (previewResponse) {
    report.finalUrl = previewResponse.url || null;
    addItem('Reachability', previewResponse.ok ? 'pass' : 'warn', `status ${previewResponse.status}`);

    if (report.finalUrl) {
      addItem('Final URL', 'info', report.finalUrl);
    }

    const xRobotsTag = previewResponse.headers.get('x-robots-tag');
    if (!xRobotsTag) {
      addItem('X-Robots-Tag', 'warn', 'header missing');
    } else if (xRobotsTag.toLowerCase().includes('noindex')) {
      addItem('X-Robots-Tag', 'pass', xRobotsTag);
    } else {
      addItem('X-Robots-Tag', 'warn', xRobotsTag);
    }
  } else {
    addItem('X-Robots-Tag', 'info', 'check unavailable: no preview response');
  }

  try {
    const robotsUrl = new URL('/robots.txt', previewOrigin).toString();
    const robotsResponse = await fetchWithTimeout(robotsUrl, { method: 'GET' }, timeoutMs);

    if (!robotsResponse.ok) {
      addItem('robots.txt', 'warn', `not available (status ${robotsResponse.status})`);
    } else {
      const robotsText = await robotsResponse.text();
      const hasDisallowAll = robotsText.toLowerCase().includes('disallow: /');
      addItem(
        'robots.txt',
        hasDisallowAll ? 'pass' : 'warn',
        hasDisallowAll ? 'contains Disallow: /' : 'does not contain Disallow: /'
      );
    }
  } catch (error) {
    addItem('robots.txt', 'info', 'check unavailable');
  }

  const pathChecks = [
    { path: '/.env', label: '.env exposure' },
    { path: '/phpinfo.php', label: 'phpinfo exposure' },
    { path: '/debug', label: 'debug endpoint exposure' },
    { path: '/main.js.map', label: 'source map exposure (/main.js.map)' },
    { path: '/app.js.map', label: 'source map exposure (/app.js.map)' },
    { path: '/static/js/main.js.map', label: 'source map exposure (/static/js/main.js.map)' }
  ];

  for (const check of pathChecks) {
    try {
      const checkUrl = new URL(check.path, previewOrigin).toString();
      const response = await fetchWithTimeout(checkUrl, { method: 'GET' }, timeoutMs);

      if (response.status === 200) {
        addItem(check.label, 'warn', `exposed at ${check.path}`);
      } else {
        addItem(check.label, 'pass', `not exposed (status ${response.status})`);
      }
    } catch (error) {
      addItem(check.label, 'info', 'check unavailable');
    }
  }

  return report;
}

function formatSecurityReport(report) {
  const lines = ['Preview checks'];
  const icons = {
    pass: '✅',
    warn: '⚠️',
    info: 'ℹ️'
  };

  for (const item of report.items) {
    const icon = icons[item.status] || 'ℹ️';
    lines.push(`- ${icon} ${item.label}: ${item.details}`);
  }

  return lines.join('\n');
}

function securityReportWarnings(report) {
  if (!report || !Array.isArray(report.items)) {
    return [];
  }

  return report.items
    .filter((item) => item.status === 'warn')
    .map((item) => item.label);
}

function buildPrCommentBody(lockedUrl, expiresIn, securityReportText) {
  const lines = [
    '🔒 PreviewLocker',
    '',
    `Locked preview: ${lockedUrl}`,
    '',
    `Expires in: ${expiresIn} seconds`
  ];

  if (securityReportText) {
    lines.push('', securityReportText);
  }

  return lines.join('\n');
}

async function upsertPreviewLockerComment(octokit, owner, repo, issue_number, body) {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100
  });

  const existingComment = comments
    .filter((comment) => typeof comment.body === 'string' && comment.body.startsWith('🔒 PreviewLocker'))
    .sort((a, b) => b.id - a.id)[0];

  if (existingComment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body
    });
  }
}

async function run() {
  try {
    const apiKey     = core.getInput('api_key', { required: true });
    const previewUrl = core.getInput('preview_url', { required: true });
    const expiresIn  = core.getInput('expires_in') || '3600';
    const commentOnPr = isTrueInput('comment_on_pr');
    const scanPreview = isTrueInput('scan_preview');
    const failOnRisk = isTrueInput('fail_on_risk');
    const parsedTimeout = parseInt(core.getInput('scan_timeout_ms') || '5000', 10);
    const scanTimeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 5000;

    const res = await fetch('https://previewlocker.dev/issue.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        preview_url: previewUrl,
        expires_in: expiresIn
      })
    });
    if (!res.ok) throw new Error(`Issue failed: ${res.statusText}`);

    const { token } = await res.json();
    const lockedUrl = `https://previewlocker.dev/r.php?token=${token}`;

    core.setOutput('url', lockedUrl);

    let securityReportText = '';
    let warningLabels = [];
    if (scanPreview) {
      const securityReport = await runPreviewSecurityChecks(previewUrl, scanTimeoutMs);
      securityReportText = formatSecurityReport(securityReport);
      warningLabels = securityReportWarnings(securityReport);
      core.info(securityReportText);
    }

    if (!commentOnPr) {
      if (scanPreview && failOnRisk && warningLabels.length > 0) {
        throw new Error(`PreviewLocker found preview security warnings: ${warningLabels.join(', ')}`);
      }
      return;
    }

    const githubToken = core.getInput('github_token');
    if (!githubToken) {
      throw new Error('Input "github_token" is required when comment_on_pr is true.');
    }

    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
      core.warning('comment_on_pr is true, but no pull_request was found in the GitHub Actions context. Skipping PR comment.');
      return;
    }

    const octokit = github.getOctokit(githubToken);
    const { owner, repo } = github.context.repo;
    const issue_number = pullRequest.number;
    const commentBody = buildPrCommentBody(
      lockedUrl,
      expiresIn,
      scanPreview ? securityReportText : ''
    );

    await upsertPreviewLockerComment(octokit, owner, repo, issue_number, commentBody);

    if (scanPreview && failOnRisk && warningLabels.length > 0) {
      throw new Error(`PreviewLocker found preview security warnings: ${warningLabels.join(', ')}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
