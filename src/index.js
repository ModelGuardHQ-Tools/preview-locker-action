import * as core from '@actions/core';
import fetch from 'node-fetch';

async function run() {
  try {
    const apiKey     = core.getInput('api_key', { required: true });
    const previewUrl = core.getInput('preview_url', { required: true });
    const expiresIn  = core.getInput('expires_in') || '3600';

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
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
