# Composio APM (Integrations) take-home: paste-ready answers

Note: I couldn't read the Google Form's fields because it requires a Google sign-in. Match these answers to the form's questions.

**Name:** J Ravi Kishore Reddy
**Email:** ravikishore010703@gmail.com

**Link to working experience:** https://ravi205556.github.io/oauth-setup-guides/

**Source repository:** https://github.com/Ravi205556/oauth-setup-guides
(README covers setup, key decisions and limitations. Verification log: VERIFICATION.md, also at https://ravi205556.github.io/oauth-setup-guides/verification.html)

**Summary of approach:**
I built a small web app where a developer looks up an app and gets a shareable guide covering whether they need their own OAuth app at all (Composio-managed or bring-your-own), difficulty, setup effort and approval wait shown separately, steps, requirements and blockers, and what an agent can do versus what the developer must do. There is a library of 6 hand-sourced guides chosen for different approval patterns (GitHub, Slack, Notion, Zoom, Google restricted scopes, LinkedIn). For any other app, a serverless agent on Vercel (https://oauth-setup-guides-gamma.vercel.app/api/generate) generates a guide in a few seconds. Every claim is tagged sourced, inferred or unverified, with a link.

**Key decisions:**
- Each guide opens with "do you even need your own app?" The Composio-managed status comes from a deterministic parse of Composio's managed-auth list, not from the model, because an early run claimed every app was managed.
- I split setup effort from approval wait, because developers plan around the wait. Review times are shown only when a source states them. Otherwise the guide says "not published" and any estimate is clearly labelled.
- Difficulty depends on the goal, not just the app. For example, Slack is easy unlisted and hard for the Marketplace.
- Trust over completeness: "sourced" requires a URL the search tool actually returned, and dead cited links are dropped automatically.
- I chose a small, varied, checked library over 100 unchecked guides.

**How I checked the guidance:** I checked 11 claims against official docs. 6 were confirmed, 3 corrected (a wrong cited page, the model claiming every app was Composio-managed, and dead remembered URLs) and 2 could not be verified (Dropbox and Shopify review times). Details are in VERIFICATION.md.

**Limitations:**
- The deployed backend currently runs without live web search. Both of my free keys lacked search quota (xAI had no credits and Gemini's grounding quota was unavailable). Generated guides come from model memory, are labelled "no live search", and their claims are capped at inferred or unverified. Adding a search-capable key turns live search on with no code change.
- I did not create an OAuth app with any real provider, so everything is checked against docs, not setup attempts.
- The library has 6 guides, not 100. Live-generated guides are kept only in the browser session, so their share links don't work across browsers.
- The guides have not been reviewed by a human expert. Some docs, such as Shopify's, render with JavaScript and could not be fetched for checking.

**What I'd do next with more time:**
1. Seed the 100-app list from Composio's OAuth toolkits, batch-generate the guides with live search on, have a person review each one, and store them with a "last verified" date and a monthly re-check.
2. Have a browser agent attempt the self-serve steps (create the app, set the redirect URI) in sandbox accounts, so steps move from "sourced" to "tested".
3. Store generated guides on the server, so share links work for anyone.
4. Add a "hit a blocker?" section built from reviewer rejection reasons.

**Time spent:** [RAVI TO FILL IN: actual hours]
