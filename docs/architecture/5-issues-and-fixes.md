# 5. Issues And Fixes

## What This Page Is For

This page records the kinds of problems that have already appeared in the architecture and what was done about them. It is useful for debugging, code review, and avoiding repeat mistakes.

## Known Issues And Fixes

### 1) Duplicate Chat History Storage

Issue:
- Chat history existed in more than one place, which could create confusion about the source of truth.

Fix:
- Keep one primary memory/data path for conversation storage and avoid writing the same history in multiple systems.

### 2) Identity Trust From Request Payloads

Issue:
- Some routes accepted user identifiers from the client instead of relying only on authenticated identity.

Fix:
- Derive identity from verified auth context and scope requests to the authenticated user.

### 3) Missing Production Encryption Configuration

Issue:
- Production startup could fail if the required encryption key was not configured.

Fix:
- Fail closed in production and document the secret requirement in the security runbook.

### 4) Internal Service Trust

Issue:
- Internal service calls need a clear trust boundary so public requests cannot impersonate services.

Fix:
- Require internal auth tokens and keep service-only endpoints off public exposure.

### 5) Prompt And Router Confusion

Issue:
- Unclear routing can send a message to the wrong agent or lead to low-confidence responses.

Fix:
- Use structured classification, confidence gates, and a clarifying fallback.

## Debugging Checklist

- Confirm the request is authenticated.
- Confirm the route is scoped to the right user.
- Confirm the intended service owns the data.
- Confirm the response was not filtered or merged incorrectly on the client.
- Confirm the logs do not hide the real failure behind a secondary error.

## When To Update This Page

Add a new entry here whenever:
- a bug required more than one file to fix,
- a bug affected routing, memory, auth, or data ownership,
- or a bug taught a reusable lesson for future changes.