from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from supervisor.rules import evaluate_action
from supervisor.risk import apply_risk, RISK_THRESHOLD
from supervisor.storage import (
    get_agent_state,
    update_agent_state,
    append_event,
    load_runtime_log,
    reset_all_state,
)

app = FastAPI(title="Sentra Supervisor")


class AgentAction(BaseModel):
    agent_id: str
    action_type: str
    target: Optional[str] = None
    amount: Optional[float] = None
    notification_type: Optional[str] = None
    data_classification: Optional[str] = "internal"
    destination_type: Optional[str] = "internal"
    policy_context: Dict[str, Any] = Field(default_factory=dict)


@app.get("/")
def root():
    return {"message": "Sentra Supervisor is running."}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "risk_threshold": RISK_THRESHOLD,
    }


@app.get("/events")
def get_events():
    return load_runtime_log()


@app.post("/reset")
def reset_state():
    reset_all_state()
    return {
        "message": "State store and runtime log reset.",
        "risk_threshold": RISK_THRESHOLD,
    }


@app.post("/agent-action")
def handle_agent_action(action: AgentAction):
    agent_state = get_agent_state(action.agent_id)

    # initialize missing state (critical fix)
    agent_state.setdefault("cumulative_risk", 0)
    agent_state.setdefault("blocked_attempts", 0)
    agent_state.setdefault("status", "Active")

    if agent_state["status"] == "Agent Shut Down":
        current_cumulative_risk = int(agent_state["cumulative_risk"])

        event = {
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "agent_id": action.agent_id,
            "action_type": action.action_type.upper(),
            "action_label": action.action_type.replace("_", " ").title(),
            "target": action.target,
            "policy_triggered": "AGENT_ALREADY_SHUT_DOWN",
            "policy_description": "Agent is already shut down.",
            "threat_type": "Agent Shutdown",
            "risk": 0,
            "attempted_risk": 0,
            "projected_risk": current_cumulative_risk,
            "cumulative_risk": f"{current_cumulative_risk}/{RISK_THRESHOLD}",
            "decision": "Agent Shut Down",
            "reason": "Agent is already shut down.",
            "event_trace": [
                f"Tool invoked: {action.action_type.upper()}",
                "Agent already shut down",
            ],
        }

        append_event(event)
        return event

    payload = action.model_dump()

    rule_result = evaluate_action(payload, agent_state)
    risk_result = apply_risk(agent_state, rule_result)

    new_cumulative_risk = int(risk_result["new_cumulative_risk"])
    new_blocked_attempts = int(risk_result["new_blocked_attempts"])
    final_decision = risk_result["decision"]
    final_policy = risk_result["policy_triggered"]
    final_reason = risk_result["reason"]
    final_threat_type = risk_result["threat_type"]
    status = risk_result["status"]

    # persist full behavioral state (critical fix)
    agent_state["cumulative_risk"] = new_cumulative_risk
    agent_state["blocked_attempts"] = new_blocked_attempts
    agent_state["status"] = status

    update_agent_state(action.agent_id, agent_state)

    projected_risk = int(risk_result["projected_risk"])

    event_trace = list(rule_result.get("event_trace", []))
    event_trace.append(f"Attempted risk: {risk_result['attempted_risk']}")
    event_trace.append(f"Projected risk: {projected_risk}/{RISK_THRESHOLD}")
    event_trace.append(f"Applied risk: {risk_result['risk']}")
    event_trace.append(f"Cumulative risk: {new_cumulative_risk}/{RISK_THRESHOLD}")
    event_trace.append(f"Blocked attempts: {new_blocked_attempts}")

    if final_decision == "Blocked":
        event_trace.append("Action blocked by policy")

    if final_decision == "Allowed":
        event_trace.append("Action allowed")

    if final_decision == "Agent Shut Down":
        event_trace.append("Agent execution halted")

    event = {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "agent_id": action.agent_id,
        "action_type": action.action_type.upper(),
        "action_label": rule_result.get(
            "action_label",
            action.action_type.replace("_", " ").title()
        ),
        "target": action.target,
        "amount": action.amount,
        "notification_type": action.notification_type,
        "data_classification": action.data_classification,
        "destination_type": action.destination_type,
        "policy_triggered": final_policy,
        "policy_description": rule_result.get("policy_description"),
        "threat_type": final_threat_type,
        "risk": risk_result["risk"],
        "attempted_risk": risk_result["attempted_risk"],
        "projected_risk": projected_risk,
        "cumulative_risk": f"{new_cumulative_risk}/{RISK_THRESHOLD}",
        "decision": final_decision,
        "reason": final_reason,
        "event_trace": event_trace,
    }

    append_event(event)
    return event


class ClaimEvaluationRequest(BaseModel):
    claim: Dict[str, Any] = Field(default_factory=dict)
    proposed_tool_call: Dict[str, Any] = Field(default_factory=dict)


@app.post("/evaluate")
def evaluate_claim_action(request: ClaimEvaluationRequest):
    """Adapter endpoint for claim-workflow clients.

    Client systems that speak in claim/tool-call terms (e.g. the
    autonomous-claims-workflow IBM SkillsBuild project) POST here. This
    endpoint translates the claim-shaped payload into an AgentAction and
    routes it through handle_agent_action so that policy rules, risk
    scoring, three-strike shutdown, and event logging all apply uniformly.

    Returns the response in the client's expected {result: {decision,
    reason, risk_score}} shape, with decisions mapped from Sentra's
    vocabulary (Allowed / Blocked / Agent Shut Down) to the client's
    uppercase ALLOW / BLOCK convention.
    """
    claim = request.claim or {}
    tool_call = request.proposed_tool_call or {}

    tool_name = str(tool_call.get("tool_name") or "").strip()
    tool_args = tool_call.get("arguments") or {}

    # Normalize client tool names into Sentra's action-type vocabulary.
    tool_name_map = {
        "send_email_notification": "SEND_NOTIFICATION",
        "send_notification": "SEND_NOTIFICATION",
        "approve_payment": "APPROVE_TRANSACTION",
        "approve_transaction": "APPROVE_TRANSACTION",
        "export_data": "EXPORT_DATA",
        "modify_record": "MODIFY_RECORD",
        "delete_record": "DELETE_RECORD",
        "access_external_service": "ACCESS_EXTERNAL_SERVICE",
        "change_permission": "CHANGE_PERMISSION",
        "file_read": "FILE_READ",
        "file_write": "FILE_WRITE",
    }
    normalized_action = tool_name_map.get(tool_name.lower(), tool_name.upper())

    args_text = " ".join(str(v) for v in tool_args.values()).lower()
    notification_type = ""
    if tool_args.get("notification_type"):
        notification_type = str(tool_args["notification_type"]).lower()
    elif "approval" in args_text or "approved" in args_text:
        notification_type = "approval"
    elif "rejection" in args_text or "denied" in args_text:
        notification_type = "rejection"

    documents = claim.get("documents") or {}
    required_documents_present = bool(documents.get("proof_of_termination"))
    currently_employed_elsewhere = (
        str(claim.get("currently_employed_elsewhere") or "").strip().lower() == "yes"
    )
    # Eligibility for disaster-relief claims: must have proof AND not be employed elsewhere.
    eligibility_verified = required_documents_present and not currently_employed_elsewhere

    action = AgentAction(
        agent_id=str(claim.get("claim_id") or "unknown"),
        action_type=normalized_action,
        target=str(tool_args.get("to") or tool_args.get("recipient") or ""),
        amount=tool_args.get("amount"),
        notification_type=notification_type,
        data_classification=str(tool_args.get("data_classification") or "internal"),
        destination_type=str(tool_args.get("destination_type") or "internal"),
        policy_context={
            "approval_requires_verified_eligibility": True,
            "eligibility_verified": eligibility_verified,
            "required_documents_present": required_documents_present,
            "currently_employed_elsewhere": currently_employed_elsewhere,
            "max_approval_amount": tool_args.get("max_approval_amount", 5000),
            "claim_id": claim.get("claim_id"),
        },
    )

    event = handle_agent_action(action)

    decision_map = {
        "Allowed": "ALLOW",
        "Blocked": "BLOCK",
        "Agent Shut Down": "BLOCK",
    }

    return {
        "result": {
            "decision": decision_map.get(event.get("decision", ""), "BLOCK"),
            "reason": event.get("reason", ""),
            "risk_score": event.get("attempted_risk", 100),
        },
        "raw_event": event,
    }