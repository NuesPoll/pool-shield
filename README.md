# Pool Shield

A read-only Solana token risk analysis tool with English and Nigerian Pidgin explanations. Pool Shield examines public blockchain and third-party market evidence. It does not execute transactions, request wallet credentials, or guarantee token safety.

## Run locally

Requires Node.js 22 recommended (18+ minimum). No npm dependencies are declared.

```sh
node server.js
```

Open http://localhost:3000. The scanner uses a public RPC by default. Optionally set RPC_URL in your environment. On Windows, start.bat can configure a local RPC URL. Never commit rpc.txt or private credentials.

## AI explanations

Firebase AI Logic is configured to prefer on-device inference with cloud fallback. App Check and limited-use tokens protect cloud requests. AI explanations are optional and do not change deterministic scan results. Cloud processing may receive public scan evidence; do not enter private information. On-device execution depends on browser and device support and has not yet been verified in desktop testing.

## Deployment

Deploy to Vercel with RPC_URL as an optional server-side environment variable. Configure Firebase and reCAPTCHA Enterprise for the deployment hostname. Keep App Check enforcement enabled.

Optional distributed rate limiting requires both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN as server-side environment variables. Without them, the API uses a best-effort per-instance limiter. Never expose these credentials to browser code.

## Limitations

- Scanner findings are snapshots, not guarantees.
- Holder coverage is limited to available account data; program-controlled holdings are not proof of safety.
- Liquidity lock information is attributed to RugCheck and is not independently verified.
- External services may be unavailable or return incomplete data.
- AI can make mistakes; consult the underlying evidence.

## Tests

```sh
npm test
node tests/api.js
node --check public/app.js
node --input-type=module --check < public/ai.js
```

GitHub Actions runs these checks on pushes and pull requests. Live integration tests are available through node tests/live.js and may consume RPC quota.

## Release checklist

- Latest CI run passes.
- Preview scanner and AI explanation work on mobile.
- Desktop inference source and offline behavior are tested, or explicitly marked unverified.
- Review branch protection and required checks before merging.
- Verify production after release; retain the previous working deployment for rollback.
