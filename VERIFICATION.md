# Verification log

Checked on 27 Oct 2026 by fetching the official pages listed below. **No OAuth app was created on any real provider.** Every check is a docs check, not a setup attempt.

| # | Claim (where it appeared) | Result | Source checked |
|---|---|---|---|
| 1 | Google: apps that use restricted scopes need a security assessment (library guide) | **Confirmed.** It is an *annual* assessment by a Google-empanelled assessor. | https://support.google.com/cloud/answer/13464321 |
| 2 | Dropbox: apps need "production approval" to go beyond development, and Dropbox reviews the permissions you request (generated guide) | **Confirmed.** The developer guide has "Production approval / Applying for production status" sections and says it checks for least-privileged permissions. | https://www.dropbox.com/developers/reference/developer-guide |
| 3 | Dropbox: review time (generated guide said "not published, estimate 3-5 business days") | **Could not verify.** No review time appears on the page. The figure stays labelled as an estimate. | same as above |
| 4 | Dropbox: "up to 500 users" before approval (earlier Gemini run) | **Could not verify, so I removed it.** The new prompt forbids numbers without a source. | same as above |
| 5 | Typeform: you register the app in the admin panel's Applications section and get a client ID and secret (generated guide) | **Confirmed.** | https://www.typeform.com/developers/get-started/applications/ |
| 6 | Typeform: source cited for the setup steps (generated guide cited `/developers/webhooks/`) | **Corrected.** The webhooks page doesn't cover OAuth app setup. The correct page is the one in row 5. All of this guide's claims stayed "inferred". | — |
| 7 | Shopify: "app review typically takes 3 to 5 business days" (generated guide) | **Could not verify.** The shopify.dev review-process page is rendered with JavaScript, and my fetch couldn't read it. Treat the figure as unverified. | https://shopify.dev/docs/apps/launch/app-store-review/review-process |
| 8 | "Composio manages the OAuth app" (earlier runs said yes for *every* app) | **Corrected.** This was a model guess. The server now reads Composio's list. Dropbox and Typeform are under "Composio-managed OAuth available", and Shopify is under "Bring your own OAuth app". | https://docs.composio.dev/toolkits/managed-auth.md |
| 9 | Model-remembered source URLs | **Corrected.** In the first Gemini run, 3 of 6 remembered URLs returned 404. They are now checked and dropped automatically, and their claims become "unverified". | — |

## What I learned
- Review times are rarely published. The honest answer is "not published", plus a clearly labelled estimate.
- The Composio-managed status has to come from a deterministic lookup, not the model.
- Without live search, model citations are often wrong (row 6) or dead (row 9). That is why "sourced" now requires a URL that the live search tool actually returned.
