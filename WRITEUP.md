# OAuth Setup Guides — Composio APM (Integrations) take-home
Ravi Kishore Reddy · draft of 27 Oct 2026

## The problem as I understand it
An agent builder wants users to connect an app such as Gmail or Slack. A **provider OAuth app** (client ID, secret, redirect URI, scopes) belongs to the *developer*. Each user's *connection* is a token issued through that app. Composio's managed OAuth directory (https://docs.composio.dev/toolkits/managed-auth) lists 124 toolkits where Composio supplies the OAuth app, so the developer creates nothing. You bring your own app when a toolkit isn't managed, or when you want your own branding on the consent screen, custom scopes or a separate rate-limit quota. You can check managed status per toolkit through `composio_managed_auth_schemes` on the toolkit API. For a developer, the painful unknown is approval: it can be zero (GitHub), up to ~10 weeks (Slack Marketplace functional review), or weeks plus a paid annual security assessment (Google restricted scopes).

## Product decisions
- **Lead every guide with "do you even need your own app?"** The cheapest path is often Composio-managed auth. Each guide says whether the app is in the managed directory.
- **Split time into setup effort and approval wait.** These are different costs, and developers plan around the wait.
- **Tier by goal, not just by app.** Slack and LinkedIn are easy for basic use and hard for the Marketplace or company pages, so their difficulty is shown as a range.
- **Every claim is tagged sourced, inferred or unverified, with a link.** Trust matters more than completeness, and unknown review times are never guessed.
- **Agent vs human split.** Agents can draft manifests, scope justifications, test plans, domain-verification files and demo-video storyboards. Humans must sign in, prove domain ownership, give legal or business details, record videos, pay assessors and answer reviewers.
- **Scope: 6 guides chosen for variety.** Easy: GitHub, Slack unlisted. Medium: Notion, Zoom. Hard: Google restricted scopes, LinkedIn Community Management. This covers the main approval patterns: no review, optional marketplace review, mandatory review, security assessment, and partner-style gated products.

## Tested vs sourced vs uncertain
- **Tested:** the web app itself (library, guide pages, shareable `#/guide/<slug>` links). The backend returns a clean 503 when no key is set. **No OAuth app was actually created on any provider**, because no developer accounts were used. All provider facts are **sourced** from official docs fetched on 27 Oct 2026. The LinkedIn rate limits come from a third-party guide and are tagged unverified.
- **Uncertain:** Notion review duration, Google end-to-end verification time and assessor cost, LinkedIn review times, and whether Zoom is Composio-managed (my fetch of the directory list was cut off before "Z").
- **Live generation:** `api/generate.js` uses xAI Grok first, through the Responses API with the live `web_search` tool, and Gemini as the fallback. A claim can be "sourced" only when the search tool actually returned its URL. Times come from sources or say "not published". The Composio-managed status comes from a server-side parse of Composio's managed-auth list, which fixed an earlier run where the model claimed every app was managed. Dead links are dropped. Local test on 27 Oct 2026: the xAI key had no credits (403), so the run fell back to Gemini without search. Shopify took 8.9 s, Dropbox 16.1 s and Typeform 2.7 s, all inside the 60 s cap. No real OAuth setup was attempted. See VERIFICATION.md.

## Limitations and next steps (toward 100 apps)
1. Seed the list from Composio's OAuth toolkits and mark managed vs bring-your-own (the API field `composio_managed_auth_schemes`).
2. Batch-run the generator, then have a human review each guide before it goes into the library. Store the guides as JSON with a `last_verified` date and re-check them monthly, because review times change. For example, Zoom moved from 72h to 5 business days on 7 Oct 2026.
3. Let a browser agent actually attempt the self-serve parts (create app, set redirect) in sandbox accounts, so steps move from "sourced" to "tested".
4. Add persistent storage for live guides, so share links work across browsers (today they are stored only in the session).
