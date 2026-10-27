# OAuth Setup Guides

Shareable guides on how hard it is to create and get approval for an OAuth app with a given provider. Built for the Composio APM (Integrations) take-home. See `WRITEUP.md`.

- Static site: `public/` (mirrored to `docs/` for GitHub Pages): https://ravi205556.github.io/oauth-setup-guides/
- Live generation: `api/generate.js`, a Vercel function using **Google Gemini** (`gemini-2.5-flash`) with Google Search grounding.

## Deploy the backend on Vercel
1. Get a key at https://aistudio.google.com (Get API key).
2. Import this repo on vercel.com (or `npx vercel --prod`). Output dir is `public` (see `vercel.json`).
3. Project → Settings → Environment Variables: `GEMINI_API_KEY` = your key (optional `GEMINI_MODEL`, `ALLOW_ORIGIN`). Redeploy.
4. Set `window.GENERATE_URL='https://<project>.vercel.app/api/generate'` in `public/config.js` and `docs/config.js` so the GitHub Pages site uses it.

Without the key the function returns HTTP 503 and the UI shows "Live generation unavailable"; it never shows a made-up guide.
