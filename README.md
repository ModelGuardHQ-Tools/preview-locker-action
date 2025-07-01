# 🔒 Preview Locker Action

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Preview%20Locker-blue)](https://github.com/marketplace/actions/preview-locker)
[![CI](https://github.com/ModelGuardHQ-Tools/preview-locker-action/actions/workflows/ci.yml/badge.svg)](https://github.com/ModelGuardHQ-Tools/preview-locker-actionactions)
[![License](https://img.shields.io/github/license/ModelGuardHQ-Tools/preview-locker-action)](LICENSE)

> Secure your Netlify/Vercel/GitHub-Pages previews with time-limited links—zero infra, no leaks.

## 🚀 Quick Start

```yaml
steps:
  - uses: actions/checkout@v3

  - name: Deploy Preview
    id: deploy
    run: |
      PREVIEW_URL=$(deploy-to-netlify.sh)
      echo "::set-output name=url::$PREVIEW_URL"

  - name: Lock Preview
    id: lock
    uses: your-org/preview-locker-action@v1
    with:
      api_key: ${{ secrets.PREVIEW_LOCKER_API_KEY }}
      preview_url: ${{ steps.deploy.outputs.url }}
      expires_in: 3600  # defaults to 3600s
  - name: Comment on PR
    run: echo "🔒 Preview: ${{ steps.lock.outputs.url }}"


---

## 📥 Inputs

| Input         | Description                                     | Default |
| ------------- | ----------------------------------------------- | ------- |
| `api_key`     | Your Preview Locker API key                     | —       |
| `preview_url` | URL of the static preview to lock               | —       |
| `expires_in`  | Expiration time in seconds (max 86400 seconds)  | `3600`  |

---

## 📤 Outputs

| Output | Description                                  |
| ------ | -------------------------------------------- |
| `url`  | The signed, expiring preview link (JWT URL)  |

---

## 💡 Why Preview Locker?

- 🛠️ **Zero infra**: just add this action and two PHP endpoints—no servers to maintain.  
- 🔒 **Security**: only valid API keys can generate previews, keeping your staging sites private.  
- 🧩 **Easy integration**: works with any static host—Netlify, Vercel, GitHub Pages, S3, etc.  
- 📊 **Compliance**: built-in auditing and quota management for regulated teams.

---

## 🔍 SEO & Keywords

`preview`, `secure preview`, `static site`, `CI/CD`, `Netlify`, `Vercel`, `GitHub Action`, `time-limited link`

---

## 📝 License

MIT © [Locker API](https://previewlocker.dev/)

