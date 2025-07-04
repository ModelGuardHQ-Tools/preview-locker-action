
# 🔒 Preview Locker Action

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Preview%20Locker-blue)](https://github.com/marketplace/actions/preview-locker)
[![CI](https://github.com/ModelGuardHQ-Tools/preview-locker-action/actions/workflows/ci.yml/badge.svg)](https://github.com/ModelGuardHQ-Tools/preview-locker-actionactions)
[![License](https://img.shields.io/github/license/ModelGuardHQ-Tools/preview-locker-action)](LICENSE)

[![Website](https://img.shields.io/website-up-down-green-red/http/previewlocker.dev.svg)](https://previewlocker.dev)
[🚀 Get Started](https://previewlocker.dev) • [🛒 See Plans](https://previewlocker.dev/pricing.php)

**Ready to lock down your previews?**  

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
```

## Step-by-step: JavaScript GitHub Action entrypoint


Below is a minimal guide to wire up your `preview-locker-action` using JavaScript + esbuild.

---

1️⃣ **Initialize your npm package**

```bash
cd path/to/preview-locker-action
npm init -y
```

2️⃣ **Install runtime dependencies**

```bash
npm install @actions/core node-fetch@2
```

3️⃣ **Install bundler**

```bash
npm install --save-dev esbuild
```

4️⃣ **Create your source file** at `src/index.js`:

```js
import * as core from '@actions/core';
import fetch from 'node-fetch';

async function run() {
  try {
    const apiKey     = core.getInput('api_key', { required: true });
    const previewUrl = core.getInput('preview_url', { required: true });
    const expiresIn  = core.getInput('expires_in') || '3600';

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
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```  

5️⃣ **Add build script** to your `package.json`:

```diff
  "scripts": {
+   "build": "esbuild src/index.js --bundle --platform=node --target=node16 --outdir=dist"
  }
```

6️⃣ **Update `action.yml`** to point at the bundled file:

```yaml
runs:
  using: "node16"
  main: "dist/index.js"
```

7️⃣ **Build & commit**

```bash
npm run build
git add src/index.js dist/index.js package.json package-lock.json action.yml
git commit -m "feat: implement JS entrypoint + build"
git push
```

8️⃣ **Test locally** (optional)
- Install [act](https://github.com/nektos/act)
- Create a dummy workflow that calls your action with sample inputs.
- `act push -P ubuntu-latest=nektos/act-environments-ubuntu:18.04`

9️⃣ **Tag & publish** when you’re happy:

```bash
git tag v1.0.0
git push --tags
```  
Then draft your release and publish on the Marketplace.


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

