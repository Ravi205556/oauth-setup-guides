# OAuth Setup Guides

Shareable guides on how hard it is to create an OAuth app with a given provider and get it approved. Built for the Composio APM (Integrations) take-home. See `WRITEUP.md` for decisions and `VERIFICATION.md` (also at `/verification.html`) for the verification log.

- Static site: `public/`, mirrored to `docs/` for GitHub Pages: https://ravi205556.github.io/oauth-setup-guides/
- Live generation: `api/generate.js`, a Vercel function.
  - **Primary:** xAI Grok through the Responses API (`POST https://api.x.ai/v1/responses`) with the live `web_search` tool. The model is set by `XAI_MODEL` and defaults to `grok-4-1-fast-non-reasoning`, then other Grok models.
  - **Fallback:** Google Gemini (`GEMINI_API_KEY`). It tries Google Search grounding first, then answers without search.
  - **Composio-managed status** is never model-generated. The server parses https://docs.composio.dev/toolkits/managed-auth.md and answers Yes, No or Unverified.

## Setup
1. Get keys: xAI at https://console.x.ai (the team needs credits), and optionally Gemini at https://aistudio.google.com.
2. Import this repo on vercel.com, or run `npx vercel --prod`. The output dir is `public` (see `vercel.json`).
3. Under Settings → Environment Variables, set `XAI_API_KEY` and optionally `GEMINI_API_KEY`, `XAI_MODEL`, `GEMINI_MODEL` and `ALLOW_ORIGIN`. Then redeploy. **Keys live only in Vercel env vars. They are never in this repo.**
4. Set `window.GENERATE_URL='https://<project>.vercel.app/api/generate'` in `public/config.js` and `docs/config.js`.

## Key decisions
- Setup effort and approval wait are shown separately. Times are given only when a source states them. Otherwise the guide says "not published", with an explicitly labelled estimate.
- Each claim is tagged **sourced** only if live search ran *and* returned that exact URL as a citation. Claims reasoned from sources are tagged **inferred**, and everything else is **unverified**.
- Cited URLs that return 404 or 410 are dropped, and their claims become unverified.
- Each guide splits what an agent can do from what the developer must do themselves.
- The server enforces a ~50 s provider budget (Vercel limit 60 s) and has CORS enabled. With no key configured it returns 503, and the UI never shows a made-up guide.

## Limitations
- **No-search mode (Gemini fallback without grounding):** guides come from model memory. The server post-processes them: approval always reads "Approval time not verified (no live search)"; any time figure is labelled "unverified model estimate (no live search)" and provider-attribution phrasing ("X states...", "according to...") is stripped; any cited URL that does not return HTTP 2xx/3xx when fetched is dropped, and claims without a checked URL are tagged unverified. Tested locally with Miro and Shopify (no xAI key).
- **No OAuth app was created on any real provider.** Everything is checked against docs only. "Tested" here means the pipeline ran, not that a setup was attempted.
- On 27 Oct 2026 the xAI key returned 403 because the new team had no credits. The Grok path therefore has **not run end to end yet**. Local tests fell back to Gemini without live search, so tags were capped at "inferred".
- Some docs, such as shopify.dev, are rendered with JavaScript, so the dead-link and verification fetches can't read their content.
- Guides are not human-reviewed.

## Live backend

The live "type any app" agent is deployed on Vercel (Hobby) at `https://oauth-setup-guides-gamma.vercel.app/api/generate` (POST `{"app":"Name"}`). The GitHub Pages site calls it via `config.js`. It currently runs on Gemini without live search (search quota unavailable on the free tier), so generated guides are labelled "no live search" and claims are capped at inferred/unverified.
