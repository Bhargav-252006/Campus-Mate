# StudentMate Security Operational Runbook

This runbook defines operational handling for key security events.

## 1) Secret Rotation

Scope:
- JWT_SECRET
- INTERNAL_SERVICE_TOKEN
- DATA_ENCRYPTION_KEY
- WEBHOOK_SECRET
- LLM provider API keys

Procedure:
1. Generate new secret in secret manager.
2. Deploy with dual-read or coordinated restart strategy.
3. Revoke old secret/key immediately after rollout verification.
4. Validate auth/session, chat, profile, and memory endpoints.
5. Record incident/change ticket with rotation timestamp.

## 2) Suspected Prompt Injection Campaign

Indicators:
- Sudden increase in unsafe routing attempts.
- Abnormal tool-call patterns.
- Repeated adversarial phrases in logs/telemetry.

Response:
1. Enable stricter prompt guard policy mode.
2. Increase routing and tool denial logging (without sensitive payloads).
3. Apply temporary per-IP/per-user tighter rate limits.
4. Review sampled requests and patch detection rules.
5. Release updated guard patterns and rerun smoke tests.

## 3) Suspected Data Exfiltration Attempt

Indicators:
- Requests repeatedly asking for full history/all users.
- Unauthorized profile/history access attempts.

Response:
1. Verify authorization middleware and route scopes are active.
2. Check for unusual 403/401 spikes and failed userId probes.
3. Rotate credentials if leakage is suspected.
4. Audit logs for successful sensitive exports.
5. Notify stakeholders and document remediation.

## 4) Denial of Wallet / Cost Spike

Indicators:
- Unusual token usage and chat request volume.
- High retry loops or timeout cascade.

Response:
1. Tighten rate limits and concurrency limits.
2. Apply stricter timeout and retry caps.
3. Block abusive actors and require cooldown window.
4. Shift to lower-cost fallback model if policy allows.
5. Add post-incident cost guardrails.

## 5) Security Validation Commands (Example)

- Run app/server startup checks with required env keys.
- Run API smoke tests for auth/profile/chat/history.
- Validate production startup fails when DATA_ENCRYPTION_KEY is missing.

## 6) Release Gate (Mandatory)

A release is blocked unless all are true:
- Checklist in SECURITY_IMPLEMENTATION_CHECKLIST.md is complete.
- No critical/high security findings are open.
- Smoke verification is green.
- Secrets are sourced from environment/secret manager.

## 7) Escalation

- Developer on call: first response for code or config issues.
- Project owner: approves changes that affect auth, secrets, or data access.
- Infrastructure owner: handles container, network, and secret-manager issues.
- Incident commander: coordinates if the issue affects production users.

If the issue could expose data, rotate secrets first and investigate second.

## 8) Post-Incident Review

Document:
- what happened,
- when it was detected,
- what the impact was,
- which control failed or was missing,
- what changed to prevent recurrence,
- and what smoke test should catch it next time.

## 9) Operational Notes

- Test secret rotation in a non-production environment first.
- Keep monitoring tuned to auth failures, token spikes, and chat cost spikes.
- Record the exact environment variables used for each deployment.
