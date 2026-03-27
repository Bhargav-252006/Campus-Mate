# StudentMate Security Implementation Checklist

Use this checklist before every release.

## A. Router and Prompt Security

- [ ] Router output is strict JSON with schema validation.
- [ ] User message is clearly delimited as untrusted data in every prompt.
- [ ] Intent values are allowlisted and unknown values are rejected.
- [ ] Prompt sanitization runs before classification and tool parsing.
- [ ] Unsafe/jailbreak patterns are detected and routed to safe fallback.

## B. Agent and Tool Isolation

- [ ] Agent-to-tool permissions are explicitly mapped.
- [ ] Out-of-scope tool calls are blocked by default.
- [ ] Privileged actions require server-side authorization checks.
- [ ] Agent outputs are validated before executing tools.

## C. Authentication and Authorization

- [ ] Identity is derived from verified token/cookie, not payload userId.
- [ ] Protected routes reject missing/invalid auth.
- [ ] IDOR paths (for example userId path params) are blocked or fully authorized.
- [ ] Profile updates use field allowlists and validation.

## D. Data Protection

- [ ] Sensitive memory/profile data is encrypted at rest in production.
- [ ] DATA_ENCRYPTION_KEY is configured for production startup.
- [ ] No secrets or sensitive message content are written to logs.
- [ ] Data access is strictly scoped to authenticated user context.

## E. Service-to-Service Security

- [ ] Internal endpoints require INTERNAL_SERVICE_TOKEN.
- [ ] Missing internal auth fails closed in production.
- [ ] Required identity headers are validated at internal services.

## F. API Abuse and Cost Controls

- [ ] Rate limits exist for general and chat endpoints.
- [ ] Timeouts and retry ceilings are configured.
- [ ] LLM usage is traced (tokens, latency, failure rates).
- [ ] Denial-of-wallet thresholds and alerts are configured.

## G. Frontend and Browser Security

- [ ] Auth uses HttpOnly cookie flow (no localStorage tokens).
- [ ] Client does not send userId for identity-critical operations.
- [ ] CSP is restrictive and reviewed.
- [ ] CORS allowlist matches approved frontend origins only.

## H. Runtime Verification (Smoke)

- [ ] Auth/session endpoint returns valid token/cookie.
- [ ] Profile read succeeds for authenticated user.
- [ ] Invalid profile fields are rejected with 400.
- [ ] Profile access by explicit userId is blocked (403).
- [ ] Chat and history endpoints function under authenticated context.

## I. Incident Readiness

- [ ] Key rotation steps documented and tested.
- [ ] Emergency feature kill-switches defined.
- [ ] Security regression tests are part of CI/CD.

## J. How To Use This Checklist

1. Review it before merging auth, routing, memory, or deployment changes.
2. Mark each item only after you have tested the real path in the app.
3. If one item fails, treat it as a release blocker until it is fixed or documented.

## K. What Good Looks Like

- The router returns predictable structured output.
- User messages cannot rewrite system instructions.
- One user cannot read another user’s records.
- Production only starts when the required secrets are present.
- Internal endpoints stay private and authenticated.

## L. Suggested Proof For Each Item

For every item you verify, save a short note with:
- the route or file tested,
- the request made,
- the expected result,
- the actual result,
- and the date.
