# Glossary

This glossary explains the main terms used in the project docs.

## AI And Agent Terms

- Router: the logic that decides which specialized agent should answer a message.
- Intent: the category of a message, such as academic, emotional support, or general.
- Confidence: how certain the router is about the chosen intent.
- Agent: a specialized prompt path for a specific type of help.
- Tool call: a request for the system to perform a helper action, like starting a timer or saving a note.
- Prompt injection: user content that tries to override system instructions.
- Jailbreak: an attempt to bypass safety rules or force the model to ignore policy.

## Memory Terms

- Working memory: current conversation context.
- Short-term memory: recent messages kept for continuity.
- Episodic memory: summaries of important events.
- Semantic memory: extracted facts and stable knowledge.
- Profile memory: user preferences and learning style.
- Context window: the amount of text the model can see at once.

## Backend Terms

- API Gateway: the public entry point that routes traffic to internal services.
- IDOR: insecure direct object reference, when one user can access another user’s data by changing an identifier.
- CORS: browser rules that control which origins can call an API.
- CSP: content security policy for reducing browser attack surface.
- Rate limit: a cap on how many requests can be made in a time window.
- Internal service token: a secret used only between backend services.
- Smoke test: a quick end-to-end test to confirm the system works.

## Storage Terms

- PostgreSQL: the main relational database.
- Redis: the cache and fast coordination layer.
- LocalStorage: browser-side storage used by some UI features.

## UI Terms

- Dashboard: the main overview page.
- Card: a bordered content container.
- Modal: a popup dialog for forms or confirmation.
- Empty state: a screen shown when there is no data yet.
- Quick action: a shortcut button for a common task.# Glossary

This glossary explains the terms used across the project docs.

## Agent And AI Terms

- Router: the logic that decides which specialized agent should answer a message.
- Intent: the category of a user message, such as academic, emotional support, or general.
- Confidence: how sure the router is about the chosen intent.
- Agent: a specialized model prompt path for a particular kind of response.
- Tool call: a request for the system to run a helper action, such as saving a note or starting a timer.
- Prompt injection: user content that tries to override system instructions.
- Jailbreak: an attempt to bypass safety rules or force the model to ignore policy.

## Memory Terms

- Working memory: the short-lived current context for active conversation.
- Short-term memory: recent messages kept for continuity.
- Episodic memory: summaries of important conversation events.
- Semantic memory: extracted facts about the user.
- Profile memory: user preferences and learning style data.
- Context window: the amount of text the model can see at once.

## System Terms

- API Gateway: the public entry point that routes traffic to internal services.
- IDOR: insecure direct object reference, when one user can access another user’s data by changing an identifier.
- CORS: browser security rules that control which origins can call an API.
- CSP: content security policy, used to reduce browser-based attack surface.
- Rate limit: a cap on how many requests can be made in a time window.
- Internal service token: a secret used only between backend services.
- Smoke test: a quick end-to-end test to confirm the system still works.

## Storage Terms

- PostgreSQL: the main relational database used by the project.
- Redis: the cache and message coordination layer.
- LocalStorage: browser storage used by some frontend features.

## UI Terms

- Dashboard: the main overview page.
- Quick action: a shortcut button for common tasks.
- Modal: a popup dialog for forms or confirmations.
- Empty state: a screen shown when no data exists yet.
- Card: a bordered content container.