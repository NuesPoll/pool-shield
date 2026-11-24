# Security policy

Pool Shield is a read-only public-data analysis application. It does not require wallet secrets or execute transactions.

## Reporting
Report suspected vulnerabilities privately through GitHub private vulnerability reporting if enabled. Otherwise contact the repository maintainer privately. Do not include credentials or personal data in public issues.

## Security boundaries
- Treat scanner results and AI explanations as informational, not guarantees.
- Third-party market and lock data are not independently verified.
- Cloud AI may process public scan evidence.
- App Check protects Firebase AI requests; scanner rate limiting is a separate control.
- The default rate limiter is per-instance. Shared Redis protection requires server-side configuration.

## Release checks
Run scanner and API regression tests, verify preview functionality, review dependency and credential exposure, and confirm deployment rollback readiness. Verify on-device inference on supported hardware before claiming it works.

Never commit private RPC URLs, Redis credentials or local environment files. Rotate any exposed secrets.
