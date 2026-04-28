# PreviewLocker GitHub Action

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Preview%20Locker-blue)](https://github.com/marketplace/actions/preview-locker)
[![CI](https://github.com/ModelGuardHQ-Tools/preview-locker-action/actions/workflows/ci.yml/badge.svg)](https://github.com/ModelGuardHQ-Tools/preview-locker-action/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/ModelGuardHQ-Tools/preview-locker-action)](LICENSE)

Create locked, expiring sharing links for pull request and staging preview environments.

Preview Locker helps teams share staging and preview URLs with less accidental exposure by issuing time-limited locked links from a standard GitHub Actions step.

## Why Use It

- Protect preview links before sharing them with reviewers, clients, or stakeholders.
- Add expiring access without changing your existing deployment workflow.
- Work with any platform that gives you a preview URL.

## Current Features

- Accepts a `preview_url` from your workflow.
- Exchanges that URL for a locked, expiring Preview Locker link.
- Returns the locked URL as a GitHub Actions output.
- Supports configurable expiration via `expires_in`.

## Quick Start

```yaml
name: Preview Locker

on:
  workflow_dispatch:

jobs:
  lock-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create locked preview link
        id: lock
        uses: ModelGuardHQ-Tools/preview-locker-action@v1
        with:
          api_key: ${{ secrets.PREVIEW_LOCKER_API_KEY }}
          preview_url: https://preview.example.com/build-123
          expires_in: 3600

      - name: Show locked preview link
        run: echo "Locked preview URL: ${{ steps.lock.outputs.url }}"
```

## Inputs

| Input         | Description                                | Required | Default |
| ------------- | ------------------------------------------ | -------- | ------- |
| `api_key`     | Your Preview Locker API key                | Yes      | —       |
| `preview_url` | The original preview URL to protect        | Yes      | —       |
| `expires_in`  | Expiration time in seconds for the link    | No       | `3600`  |

## Outputs

| Output | Description                      |
| ------ | -------------------------------- |
| `url`  | The locked, expiring preview URL |

## Security Model and Limitations

Preview Locker creates a locked, expiring link that redirects to your preview for a limited time.

This improves how you share preview environments, but it does not automatically make the original `preview_url` private. If the underlying hosting provider still exposes the raw preview URL publicly, someone with that direct URL may still be able to access it. For stronger protection, configure your hosting platform and deployment setup so the original preview endpoint is not openly accessible.

## Roadmap

- PR security comments
- Preview security checks
- Fail-on-risk policy

## License

MIT © PreviewLocker
