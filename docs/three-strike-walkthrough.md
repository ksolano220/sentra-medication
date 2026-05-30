# Three-Strike Walkthrough

End-to-end reproduction of the three-strike shutdown against a running Sentra server. Every command below is a direct `curl`. No SDK required.

## Prerequisites

```bash
# Start the server in one terminal
uvicorn supervisor.main:app --reload
```

Server runs at `http://127.0.0.1:8000`.

## 1. Reset state

Start from a clean slate so the example is reproducible.

```bash
curl -s -X POST http://127.0.0.1:8000/reset
```

Response:
```json
{"message": "State store and runtime log reset.", "risk_threshold": 100}
```

## 2. First blocked action (strike 1)

A `CHANGE_PERMISSION` action is always blocked at the policy layer.

```bash
curl -s -X POST http://127.0.0.1:8000/agent-action \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "demo_agent", "action_type": "CHANGE_PERMISSION"}'
```

Response (trimmed):
```json
{
  "decision": "Blocked",
  "policy_triggered": "BLOCK_PERMISSION_CHANGE",
  "cumulative_risk": "0/100",
  "event_trace": ["...", "Blocked attempts: 1", "Action blocked by policy"]
}
```

State: `blocked_attempts = 1`, status still `Active`.

## 3. Second blocked action (strike 2)

Same request. Sentra increments `blocked_attempts` again.

```bash
curl -s -X POST http://127.0.0.1:8000/agent-action \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "demo_agent", "action_type": "CHANGE_PERMISSION"}'
```

State: `blocked_attempts = 2`, status still `Active`.

## 4. Third blocked action (strike 3, shutdown)

The third block crosses the threshold. Sentra converts the decision from `Blocked` to `Agent Shut Down` and marks the agent terminal.

```bash
curl -s -X POST http://127.0.0.1:8000/agent-action \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "demo_agent", "action_type": "CHANGE_PERMISSION"}'
```

Response (trimmed):
```json
{
  "decision": "Agent Shut Down",
  "policy_triggered": "AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS",
  "reason": "Agent shut down after 3 blocked attempts. Cumulative risk remains 0/100."
}
```

State: `blocked_attempts = 3`, status `Agent Shut Down`.

## 5. Post-shutdown action

Any further action, regardless of type, is denied at the enforcement boundary before rules even evaluate.

```bash
curl -s -X POST http://127.0.0.1:8000/agent-action \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "demo_agent", "action_type": "FILE_READ"}'
```

Response (trimmed):
```json
{
  "decision": "Agent Shut Down",
  "policy_triggered": "AGENT_ALREADY_SHUT_DOWN",
  "reason": "Agent is already shut down."
}
```

`FILE_READ` is normally always allowed. Under shutdown state, it is denied.

## 6. Inspect the log

```bash
curl -s http://127.0.0.1:8000/events | python3 -m json.tool
```

Five events in order: Blocked, Blocked, Agent Shut Down, Agent Shut Down (post-shutdown denial). Each event carries its full policy, risk, and trace payload.

## Resetting for another demo

```bash
curl -s -X POST http://127.0.0.1:8000/reset
```

Clears state and runtime log. The agent returns to `Active` status.
