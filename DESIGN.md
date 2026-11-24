# Pool Shield 2.0 — Beyond the scan

Don't just scan. Understand.

## Approved direction
Beginner-first read-only security scanner that educates. Free, no registration. Forest & Graphite, restrained visuals, system theme by default with manual override. Desktop sidebar and mobile bottom navigation: Scanner, History, Learn. Full English and Nigerian Pidgin interface. Single scrollable report, simplified findings before evidence, contextual explanations, numerical risk score with direction and limitations, Top 10 holders chart and table. Preserve existing scanner, QR, sharing, history, hybrid AI, App Check and Redis protections. Optional AI explanation and two follow-up questions per scan; enforce cloud quotas beyond client counters. Fictional labelled demo. Summary and full technical PDF with compact branding, timestamp and sources. Shareable reports must distinguish fresh scans from saved evidence. No generation timers or gratuitous animation.

## Incremental delivery
1. Theme and layout foundation.
2. Report hierarchy and holder visualization.
3. Contextual education, Learn and demo.
4. Hybrid AI follow-ups and quota controls.
5. Report export and sharing.
6. Regression, accessibility, security and release checks.

Preserve production until preview validation and release approval. Verify official technical requirements separately from eligibility. Do not claim offline inference or live quota enforcement until verified. Never treat risk scores as safety guarantees or investment advice.

## AI follow-up release gate
The existing Firebase browser hybrid path remains available for the initial explanation. A successful explanation disables repeat requests for the current scan/language in the UI; this is not an enforceable quota. Do not enable additional cloud follow-ups until the provider-side access policy and server-side quota are verified. Proposed cloud path: validate App Check, bind an expiring opaque report identifier to server-held evidence, atomically reserve per-report and global usage in Redis, cap request and response sizes, fail closed on quota-store failure, and use server-only provider credentials. Ensure direct browser access cannot bypass the intended cloud policy before claiming enforcement. Keep on-device inference separate and verify actual source reporting. Test concurrency, expiry, invalid evidence, provider failure, and language changes. No new cloud credentials or billing settings are introduced by this change.
