# Firebase Hybrid AI upgrade — implementation plan

This branch is isolated from production `main`.

## Existing architecture (audited 2026-11-23)
- Vanilla browser frontend: `public/index.html`, `public/app.js`
- Serverless scan endpoint: `api/scan.js`
- Deterministic Solana risk analysis: `lib/scan.js`
- Tests: `tests/unit.js`, `tests/live.js`
- No npm runtime dependencies yet.
- `vercel.json` has a restrictive Content Security Policy. Preserve it and adjust only for documented Firebase endpoints.
- Existing README says liquidity lock is **not verified**. Never represent this as a completed security check.

## Proposed competition feature
An optional **Explain this scan with AI** panel that summarizes only the existing scanner's observed evidence. It must:
1. Distinguish observed facts, missing data, and interpretations.
2. Avoid fabricated chain data or claims that a token is safe.
3. Use Firebase AI Logic Web SDK with `PREFER_ON_DEVICE` and cloud fallback.
4. Display `inferenceSource` (ON_DEVICE or IN_CLOUD) when available.
5. Show an actionable error when Firebase is unconfigured, blocked by App Check, or network is unavailable.
6. Leave the existing scan endpoint and deterministic score untouched.
7. Require user action to generate an AI explanation; no automatic chargeable inference on every scan.

## External setup required before activation
- A Firebase project with AI Logic enabled and a registered Web app.
- Firebase Web config (non-secret identifiers), and App Check production provider/configuration.
- Test on desktop Chrome >=139 with the necessary on-device model setup, and on a browser requiring cloud fallback.
- Confirm competition eligibility and permitted pre-existing code.

## Engineering acceptance tests
- `npm test` passes unchanged.
- Existing token scanning works when AI is disabled.
- AI explanations contain only supplied scan data and appropriately identify unknowns.
- Desktop local and cloud fallback paths each demonstrated with inference source.
- CSP and App Check verified in a Vercel preview deployment before merging to `main`.
- No API credentials or private RPC URLs committed.
