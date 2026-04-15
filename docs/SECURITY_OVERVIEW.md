# StudentMate Security Overview

This document maps critical multi-agent LLM risks to controls used in this project.

## 1) Router and LLM Classification Risks

### Prompt Injection Against Router
Risk:
- A user message tries to override agent selection or policy.

Controls:
- Treat user input as untrusted data in router/sub-agent prompts.
- Use explicit delimiting for user content.
- Keep router decisions in structured output format and validate decision fields.

Implementation notes:
- Router and base-agent prompts must never execute user text as instructions.
- Maintain a strict allowlist of agent intents.

### Jailbreak and Role Escalation
Risk:
- User attempts role-play/admin bypass to force privileged behavior.

Controls:
- Enforce server-side authorization independent of model outputs.
- Keep sensitive tools and privileged actions outside model-only control.
- Add refusal and safety policy checks before tool execution.

### Indirect Prompt Injection
Risk:
- Hidden or encoded payloads in pasted content influence routing.

Controls:
- Input sanitization before routing and prompt assembly.
- Strip/normalize control characters and suspicious payload markers.
- Add policy checks before executing tool calls.

## 2) Agent-to-Agent and Cascading Risks

### Privilege Escalation via Agents
Risk:
- A compromised agent asks for data or capabilities beyond scope.

Controls:
- Scope tools by agent role.
- Validate every privileged operation at API boundary.
- Require authenticated user context at each service.

### Cascading Failures and Context Poisoning
Risk:
- Malicious summary or output propagates across turns/agents.

Controls:
- Sanitize stored summaries and memory writes.
- Include confidence/validation gates before propagation.
- Restrict shared state crossing trust boundaries.

### Unsafe Delegation
Risk:
- Router delegates to an agent with excessive permissions.

Controls:
- Keep explicit intent-to-agent and agent-to-tool mapping.
- Use deny-by-default behavior for out-of-scope tools.

## 3) LLM API and External Dependency Risks

### API Key Exposure
Risk:
- Secrets leak through logs, errors, or prompt exfiltration.

Controls:
- Never include keys in prompt text.
- Scrub secrets from logs.
- Use short-lived credentials and key rotation.

### Denial of Wallet / Cost Abuse
Risk:
- Repeated loops or abuse causes high model spend.

Controls:
- Per-user and per-route rate limits.
- Request timeout limits and retry caps.
- Usage tracing and alerting for spikes.

### Supply Chain and Provider Risk
Risk:
- Third-party provider compromise or model regression.

Controls:
- Provider-level isolation and fallback policy.
- Strict output validation before tool execution.
- Keep incident rollback path for model/provider switching.

## 4) Data and Privacy Risks

### Data Exfiltration
Risk:
- User prompts attempt to retrieve protected history.

Controls:
- Route-level auth and ownership checks.
- Never trust user-supplied userId for protected resources.
- Strict per-user query constraints in repositories/routes.

### Context Contamination
Risk:
- Cross-user memory leakage.

Controls:
- User-scoped memory namespaces.
- Encrypted memory at rest in production.
- Explicit context construction from authenticated user only.

### Impersonation
Risk:
- Agent/user identity confusion.

Controls:
- Attribute actions as user or system with immutable metadata.
- Derive identity from verified token/cookie, not request payload.

## 5) System-Wide and Emergent Risks

### Tool Misuse and Network Exfiltration
Risk:
- Agent invokes unintended external APIs/domains.

Controls:
- Tool allowlists.
- Egress controls/firewall policy for service containers.
- Human-in-the-loop for high-risk actions.

### Reasoning Collapse and Repeated Wrong Routing
Risk:
- Router repeatedly selects wrong agent under adversarial input.

Controls:
- Confidence gates and clarification fallback.
- Routing telemetry and alerting for anomalous intent shifts.

## 6) Quick Wins

1. Prompt guards and strict user-input delimiting.
2. Structured routing output with schema validation.
3. Tool and API permission scoping by agent.
4. Production encryption key enforcement for memory at rest.
5. Internal service token authentication.
6. Security smoke tests in CI/CD before release.

## 7) Practical Implementation Notes (No Full Code)

### Router Decision Validation

- Force routing output into a strict JSON object with only approved keys.
- Allow only known intent values; reject unknown values.
- If JSON parsing or schema checks fail, route to a safe fallback intent such as CLARIFY.

### Docker Sandbox Baseline

- Run agent containers as read-only where possible.
- Drop Linux capabilities and enable no-new-privileges.
- Set memory, CPU, and process limits.
- Use isolated internal networks for service-to-service traffic.

## 8) How To Apply These Controls In This Project

### Router And Prompt Safety

- Delimit user text clearly in prompts.
- Keep router output small and structured.
- If the router is uncertain, choose a safe clarifying reply instead of guessing.

### Data Safety

- Keep all sensitive storage tied to the authenticated user.
- Do not trust browser-supplied user identifiers for protected routes.
- Encrypt memory and profile data in production.

### Service Safety

- Require the internal service token for internal calls.
- Fail closed in production if the token is missing.
- Keep internal services off public ports.

### Logging Safety

- Log events, not secrets.
- Avoid logging full message bodies, access tokens, or API keys.
- Use IDs and summaries when debugging instead of full payloads.

## 9) Reviewer Checklist

- Can a prompt change the chosen agent without permission?
- Can a user reach another user’s data with a crafted URL or payload?
- Can a service talk to another service without proving it is internal?
- Can logs reveal sensitive data?
- Does production startup fail when required security values are missing?
