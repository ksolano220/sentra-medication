"""
Sentra Python SDK — drop-in runtime control for any AI agent system.

WHICH METHOD SHOULD I CALL?

In most cases, use `Sentra.guard()` as a decorator on the function that
performs the side effect. It will raise `PermissionError` if Sentra blocks
the action, and let the function run otherwise. This is the recommended
integration for production code.

Use `Sentra.evaluate()` directly only when you need the raw `SentraResult`
to make custom routing decisions (e.g. fall back to a different action,
surface the reason to an end user, or log the risk score).

See README.md § "Integrate with your project" for end-to-end examples.

Quick usage:

    from sentra.sdk.client import Sentra

    sentra = Sentra()

    @sentra.guard("my_agent", "SEND_EMAIL", {"verified": False})
    def send_email(to, subject, body):
        ...

Behavior when the Sentra server is unreachable:
  * A `logging.warning` is emitted so missing infrastructure is visible.
  * The SDK returns a `Blocked` result with `risk_score=100` — fail-safe,
    never fail-open.
"""

import logging
import requests
from dataclasses import dataclass
from typing import Any, Dict, Optional

_logger = logging.getLogger("sentra.sdk")


@dataclass
class SentraResult:
    allowed: bool
    decision: str
    reason: str
    risk_score: int
    raw: Optional[Dict[str, Any]] = None


class Sentra:
    def __init__(self, url: str = "http://127.0.0.1:8000"):
        self.url = url.rstrip("/")

    def evaluate(
        self,
        agent_id: str,
        action: str,
        context: Optional[Dict[str, Any]] = None,
        target: Optional[str] = None,
        notification_type: Optional[str] = None,
    ) -> SentraResult:
        """
        Evaluate a proposed agent action against Sentra policies.

        Prefer `Sentra.guard()` as a decorator for production integration.
        Use `evaluate()` directly only when you need the raw `SentraResult`
        to make custom routing decisions (e.g. fall back to a different
        action, surface the reason to an end user, or log the risk score).

        Args:
            agent_id: Identifier for the agent (used for risk tracking)
            action: Action type (e.g. SEND_NOTIFICATION, EXPORT_DATA, FILE_WRITE)
            context: Policy context — any key/value pairs relevant to your domain
            target: Optional target of the action (e.g. email address, file path)
            notification_type: Optional notification type (e.g. approval, rejection)

        Returns:
            SentraResult with allowed, decision, reason, and risk_score.
            On server errors, a warning is logged and a fail-safe Blocked
            result is returned (never fail-open).
        """
        payload = {
            "agent_id": agent_id,
            "action_type": action,
            "target": target or "",
            "notification_type": notification_type or "",
            "policy_context": context or {},
        }

        try:
            resp = requests.post(
                f"{self.url}/agent-action", json=payload, timeout=10
            )
            resp.raise_for_status()
            data = resp.json()

            decision = data.get("decision", "Blocked")
            return SentraResult(
                allowed=decision == "Allowed",
                decision=decision,
                reason=data.get("reason", ""),
                risk_score=data.get("risk", 0),
                raw=data,
            )

        except requests.ConnectionError:
            _logger.warning(
                "Sentra server unreachable at %s — action %r by agent %r "
                "blocked by fail-safe default. Start the supervisor "
                "(`uvicorn supervisor.main:app --reload`) or update the SDK "
                "URL.",
                self.url, action, agent_id,
            )
            return SentraResult(
                allowed=False,
                decision="Blocked",
                reason="Sentra server unreachable — action blocked by default",
                risk_score=100,
            )
        except Exception as e:
            _logger.warning(
                "Sentra evaluation failed for action %r by agent %r: %s. "
                "Blocking by fail-safe default.",
                action, agent_id, e,
            )
            return SentraResult(
                allowed=False,
                decision="Blocked",
                reason=f"Sentra error: {e}",
                risk_score=100,
            )

    def guard(self, agent_id: str, action: str, context: Optional[Dict[str, Any]] = None, **kwargs):
        """
        Recommended integration. Decorator that blocks function execution
        if Sentra denies the action.

        Use this instead of calling `evaluate()` directly — it handles the
        Blocked-vs-Allowed branching for you and raises a clear
        `PermissionError` on denial, so the protected function body never
        runs on an unauthorized action.

        Usage:
            @sentra.guard("my_agent", "SEND_EMAIL", {"verified": False})
            def send_email(to, subject, body):
                ...

        Raises:
            PermissionError if Sentra blocks the action.
        """
        def decorator(func):
            def wrapper(*args, **fn_kwargs):
                result = self.evaluate(agent_id, action, context, **kwargs)
                if not result.allowed:
                    raise PermissionError(f"Sentra blocked: {result.reason}")
                return func(*args, **fn_kwargs)
            wrapper.__name__ = func.__name__
            wrapper.sentra_result = None
            return wrapper
        return decorator

    def health(self) -> bool:
        """Check if Sentra server is reachable."""
        try:
            resp = requests.get(f"{self.url}/health", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

    def reset(self):
        """Reset all agent state and event logs."""
        requests.post(f"{self.url}/reset", timeout=5)
