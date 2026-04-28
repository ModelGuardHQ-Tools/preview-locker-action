import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';

async function run() {
  try {
    const apiKey     = core.getInput('api_key', { required: true });
    const previewUrl = core.getInput('preview_url', { required: true });
    const expiresIn  = core.getInput('expires_in') || '3600';
    const commentOnPr = (core.getInput('comment_on_pr') || '').toLowerCase() === 'true';

    const res = await fetch('https://previewlocker.dev/locker/issue.php', {
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
    const lockedUrl = `https://previewlocker.dev/locker/r.php?token=${token}`;

    core.setOutput('url', lockedUrl);

    if (!commentOnPr) {
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
    const commentBody = `🔒 PreviewLocker\n\nLocked preview: ${lockedUrl}\n\nExpires in: ${expiresIn} seconds`;

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
        body: commentBody
      });
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: commentBody
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
