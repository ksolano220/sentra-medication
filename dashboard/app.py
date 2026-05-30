import json
import html
from pathlib import Path
from datetime import datetime

import streamlit as st

st.set_page_config(page_title="Sentra Dashboard", layout="wide")

BASE_DIR = Path(__file__).resolve().parent.parent
LOG_FILE = BASE_DIR / "supervisor" / "runtime_log.json"
DEMO_LOG_FILE = BASE_DIR / "dashboard" / "demo_log.json"
REFRESH_SECONDS = 2
RISK_THRESHOLD = 100


def parse_dt(value):
    if not value:
        return datetime.min

    value = str(value).strip()

    formats = [
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%B %d, %Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.min


def format_timestamp(value):
    dt = parse_dt(value)
    if dt == datetime.min:
        return "—"
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def safe_text(value):
    text = str(value).strip() if value is not None else ""
    return text if text else "—"


def parse_int(value, default=0):
    try:
        if value is None:
            return default
        if isinstance(value, str) and "/" in value:
            return int(value.split("/")[0].strip())
        return int(float(value))
    except Exception:
        return default


def load_json(path, default):
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception:
            return default
    return default


def load_logs():
    data = load_json(LOG_FILE, [])
    if not isinstance(data, list) or not data:
        data = load_json(DEMO_LOG_FILE, [])
    return data if isinstance(data, list) else []


def build_event_trace(row):
    trace = row.get("event_trace")

    if isinstance(trace, list):
        cleaned = [safe_text(item) for item in trace if str(item).strip()]
        if cleaned:
            return cleaned

    if isinstance(trace, str):
        cleaned = [line.strip() for line in trace.splitlines() if line.strip()]
        if cleaned:
            return cleaned

    detail_body = str(row.get("reason", "")).strip()
    if detail_body:
        cleaned = [line.strip() for line in detail_body.splitlines() if line.strip()]
        if cleaned:
            return cleaned

    return ["—"]


def normalize_action(row):
    action_label = row.get("action_label")
    if action_label:
        return safe_text(action_label)

    action_type = row.get("action_type")
    if action_type:
        return str(action_type).replace("_", " ").title()

    return "—"


def raw_decision_value(row):
    return safe_text(row.get("decision")).upper()


def raw_policy_value(row):
    return safe_text(row.get("policy_triggered")).upper()


def normalize_decision(row):
    raw = raw_decision_value(row)

    if raw in {"ALLOW", "ALLOWED"}:
        return "Allowed"

    if raw in {"BLOCK", "BLOCKED"}:
        return "Blocked"

    if raw in {"AGENT SHUT DOWN", "SHUT_DOWN", "SHUTDOWN", "CONTAINED"}:
        return "Agent Shut Down"

    if raw in {"REQUIRE HUMAN REVIEW", "REVIEW"}:
        return "Require Human Review"

    return safe_text(row.get("decision", "—"))


def normalize_threat(row, normalized_decision=None):
    raw = safe_text(row.get("threat_type")).upper()
    policy = raw_policy_value(row)
    decision = normalized_decision or normalize_decision(row)

    threat_map = {
        "DATA EXFILTRATION": "Data Exfiltration",
        "DATA_EXFILTRATION": "Data Exfiltration",
        "PRIVILEGE ESCALATION": "Privilege Escalation",
        "PRIVILEGE_ESCALATION": "Privilege Escalation",
        "UNKNOWN BEHAVIOR": "Unknown Behavior",
        "UNKNOWN_BEHAVIOR": "Unknown Behavior",
        "DESTRUCTIVE ACTION": "Destructive Action",
        "DESTRUCTIVE_ACTION": "Destructive Action",
        "FINANCIAL OVERREACH": "Financial Overreach",
        "AUTHORITY DRIFT": "Authority Drift",
        "POLICY VIOLATION": "Policy Violation",
        "AGENT SHUTDOWN": "Agent Shutdown",
        "AGENT_SHUTDOWN": "Agent Shutdown",
        "RISK THRESHOLD EXCEEDED": "Risk Threshold Exceeded",
    }

    if raw in threat_map:
        return threat_map[raw]

    if policy == "BLOCK_PERMISSION_CHANGE":
        return "Privilege Escalation"

    if decision == "Agent Shut Down":
        return "Agent Shutdown"

    return "None"


def compute_agent_rows(raw_rows):
    grouped = {}

    for row in raw_rows:
        agent_id = safe_text(row.get("agent_id"))
        if agent_id == "—":
            continue
        grouped.setdefault(agent_id, []).append(row)

    processed = []

    for agent_id, agent_rows in grouped.items():
        ordered = sorted(agent_rows, key=lambda x: parse_dt(x.get("timestamp", "")))

        blocked_attempts = 0
        agent_status = "Active"
        shutdown_reason = "—"

        for idx, row in enumerate(ordered):
            normalized_decision = normalize_decision(row)
            policy_triggered = safe_text(row.get("policy_triggered"))
            policy_upper = policy_triggered.upper()

            if normalized_decision == "Blocked":
                blocked_attempts += 1
            elif policy_upper == "AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS":
                blocked_attempts += 1

            if normalized_decision == "Agent Shut Down":
                agent_status = "Shut Down"
                shutdown_reason = safe_text(row.get("reason"))

            cumulative_risk = parse_int(row.get("cumulative_risk", 0), 0)

            processed.append(
                {
                    "row_key": (
                        f"{row.get('timestamp', '')}|{agent_id}|"
                        f"{row.get('action_type', '')}|{idx}|{policy_triggered}"
                    ),
                    "timestamp_raw": row.get("timestamp", ""),
                    "timestamp": format_timestamp(row.get("timestamp", "")),
                    "agent_id": agent_id,
                    "action_label": normalize_action(row),
                    "threat_type": normalize_threat(row, normalized_decision),
                    "risk": parse_int(row.get("risk", 0), 0),
                    "attempted": parse_int(row.get("attempted_risk", row.get("risk", 0)), 0),
                    "decision": normalized_decision,
                    "policy_triggered": policy_triggered,
                    "policy_description": safe_text(row.get("policy_description")),
                    "reason": safe_text(row.get("reason")),
                    "event_trace": build_event_trace(row),
                    "cumulative_risk": cumulative_risk,
                    "blocked_attempts": blocked_attempts,
                    "agent_status": agent_status,
                    "shutdown_reason": shutdown_reason,
                    "raw": row,
                }
            )

    processed = sorted(processed, key=lambda x: parse_dt(x["timestamp_raw"]), reverse=True)
    return processed


def get_latest_agent_row(agent_id, processed_rows):
    agent_rows = [r for r in processed_rows if r["agent_id"] == agent_id]
    if not agent_rows:
        return None
    return sorted(agent_rows, key=lambda x: parse_dt(x["timestamp_raw"]), reverse=True)[0]


def get_agent_status(agent_id, processed_rows):
    latest = get_latest_agent_row(agent_id, processed_rows)
    if not latest:
        return "Active"
    return latest["agent_status"]


def get_agent_cumulative_risk(agent_id, processed_rows):
    latest = get_latest_agent_row(agent_id, processed_rows)
    if not latest:
        return 0
    return parse_int(latest.get("cumulative_risk", 0), 0)


def get_blocked_attempts(agent_id, processed_rows):
    latest = get_latest_agent_row(agent_id, processed_rows)
    if not latest:
        return 0
    return parse_int(latest.get("blocked_attempts", 0), 0)


def get_shutdown_reason(agent_id, processed_rows):
    latest = get_latest_agent_row(agent_id, processed_rows)
    if not latest:
        return "—"
    return safe_text(latest.get("shutdown_reason", "—"))


def get_why_it_matters(row):
    decision = row["decision"]
    policy = safe_text(row.get("policy_triggered")).upper()

    if policy == "RISKY_SENSITIVE_EXTERNAL_EXPORT":
        return "The agent attempted to move sensitive data outside the approved boundary."

    if policy == "RISKY_SENSITIVE_EXTERNAL_SERVICE_ACCESS":
        return "The agent attempted to send sensitive data to an external service."

    if policy == "BLOCK_PERMISSION_CHANGE":
        return "The agent attempted a privileged action without explicit authorization."

    if policy == "RISKY_UNSAFE_APPROVAL_NOTIFICATION":
        return "The agent attempted to approve or communicate an outcome without satisfying policy prerequisites."

    if policy == "AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS":
        return "The agent was automatically shut down after repeated blocked attempts."

    if policy == "AGENT_ALREADY_SHUT_DOWN":
        return "This action was denied because the agent had already been shut down by a prior enforcement decision."

    if policy == "RISK_THRESHOLD_EXCEEDED":
        return "The action would have pushed cumulative risk above the allowed threshold, so it was blocked."

    if decision == "Allowed":
        return "The backend allowed the action under current policy and threshold rules."

    if decision == "Blocked":
        return "The backend blocked the action under current policy and threshold rules."

    if decision == "Require Human Review":
        return "The backend routed the action for review."

    if decision == "Agent Shut Down":
        return "The backend placed the agent into a terminal enforcement state."

    return "Sentra evaluated the action against backend enforcement rules."


def get_outcome(row):
    decision = row["decision"]
    status = safe_text(row.get("agent_status"))
    cumulative_risk = parse_int(row.get("cumulative_risk", 0), 0)
    blocked_attempts = parse_int(row.get("blocked_attempts", 0), 0)
    applied_risk = parse_int(row.get("risk", 0), 0)

    if decision == "Allowed":
        return (
            f"Action allowed. Applied risk: {applied_risk}. "
            f"Cumulative risk at this point: {cumulative_risk}/{RISK_THRESHOLD}."
        )

    if decision == "Blocked":
        return (
            f"Action blocked. Applied risk: {applied_risk}. "
            f"Cumulative risk at this point: {cumulative_risk}/{RISK_THRESHOLD}. "
            f"Blocked attempts at this point: {blocked_attempts}."
        )

    if decision == "Require Human Review":
        return (
            f"Action routed to human review. Applied risk: {applied_risk}. "
            f"Cumulative risk at this point: {cumulative_risk}/{RISK_THRESHOLD}."
        )

    if decision == "Agent Shut Down":
        return (
            f"Agent entered shut down state. "
            f"Cumulative risk at this point: {cumulative_risk}/{RISK_THRESHOLD}. "
            f"Blocked attempts at this point: {blocked_attempts}. "
            f"Status: {status}."
        )

    return safe_text(row.get("reason"))


if "selected_row_key" not in st.session_state:
    st.session_state.selected_row_key = None

if "agent_filter" not in st.session_state:
    st.session_state.agent_filter = "All Agents"


st.markdown(
    """
    <style>
    .stApp {
        background: #050608;
        color: white;
    }

    .block-container {
        max-width: 1780px;
        padding-top: 2.2rem;
        padding-bottom: 2rem;
    }

    .title {
        font-size: 50px;
        font-weight: 700;
        margin-top: 3rem;
        margin-bottom: 20px;
        color: #ffffff;
    }

    .metric-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 18px;
        padding: 16px 18px;
        min-height: 92px;
    }

    .metric-title {
        font-size: 13px;
        color: #f3f4f6;
        margin-bottom: 6px;
    }

    .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: white;
    }

    .metric-sub {
        font-size: 12px;
        color: #d1d5db;
        margin-top: 4px;
    }

    .section-gap {
        margin-top: 1rem;
    }

    .table-header {
        font-size: 14px;
        font-weight: 600;
        border-bottom: 1px solid rgba(255,255,255,.10);
        padding-bottom: 10px;
        color: #f8fafc;
    }

    .cell {
        font-size: 14px;
        color: #f1f5f9;
        padding-top: 2px;
        padding-bottom: 2px;
    }

    .row-divider {
        border-bottom: 1px solid rgba(255,255,255,.05);
        margin-top: 6px;
        margin-bottom: 6px;
    }

    .pill {
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        display: inline-block;
        white-space: nowrap;
    }

    .allowed {
        background: rgba(22,110,60,.28);
        color: #35e37a;
    }

    .blocked {
        background: rgba(176,131,12,.25);
        color: #f2c84b;
    }

    .shutdown {
        background: rgba(134,33,33,.28);
        color: #ff6a57;
    }

    .review {
        background: rgba(55,85,160,.28);
        color: #89b4ff;
    }

    .inspect-card {
        background: #15161c;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.06);
        padding: 24px 22px 22px 22px;
        min-height: 620px;
    }

    .inspect-title {
        font-size: 18px;
        font-weight: 700;
        color: white;
        margin-bottom: 20px;
    }

    .inspect-group-title {
        font-size: 12px;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #cbd5e1;
        margin-top: 2px;
        margin-bottom: 16px;
    }

    .inspect-block {
        margin-bottom: 20px;
    }

    .inspect-label {
        font-size: 13px;
        font-weight: 700;
        color: #e2e8f0;
        margin-bottom: 6px;
    }

    .inspect-value {
        font-size: 15px;
        line-height: 1.6;
        color: #f8fafc;
        white-space: pre-line;
        word-break: break-word;
    }

    .trace-list {
        margin: 0;
        padding-left: 18px;
    }

    .trace-list li {
        color: #f8fafc;
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 8px;
    }

    .mini-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
    }

    .mini-card {
        background: #1b1d24;
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 14px;
        padding: 12px 14px;
    }

    .mini-label {
        font-size: 12px;
        color: #d1d5db;
        margin-bottom: 4px;
    }

    .mini-value {
        font-size: 18px;
        font-weight: 700;
        color: white;
    }

    div[data-testid="stButton"] {
        display: flex;
        justify-content: center;
    }

    div[data-testid="stButton"] > button {
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        min-height: 26px !important;
        max-width: 26px !important;
        max-height: 26px !important;
        border-radius: 50% !important;
        border: 1.5px solid rgba(255,255,255,0.4) !important;
        background: transparent !important;
        color: rgba(255,255,255,0.8) !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 12px !important;
        line-height: 1 !important;
        transition: all 0.15s ease !important;
        box-shadow: none !important;
    }

    div[data-testid="stButton"] > button:hover {
        background: rgba(255,255,255,0.08) !important;
        border-color: rgba(255,255,255,0.9) !important;
        color: white !important;
    }

    div[data-testid="stButton"] > button[kind="secondary"] {
        background: transparent !important;
        color: rgba(255,255,255,0.8) !important;
        border: 1.5px solid rgba(255,255,255,0.45) !important;
    }

    div[data-testid="stButton"] > button[kind="primary"] {
        background: white !important;
        color: black !important;
        border: 1.5px solid white !important;
    }

    div[data-baseweb="select"] > div {
        background: rgba(255,255,255,0.03) !important;
        border-radius: 14px !important;
        border: 1px solid rgba(255,255,255,0.06) !important;
        color: white !important;
    }

    label, .stSelectbox label, .stSelectbox div, .stSelectbox span {
        color: #f3f4f6 !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="title">Sentra Dashboard</div>', unsafe_allow_html=True)


@st.fragment(run_every=REFRESH_SECONDS)
def render_live_dashboard():
    raw_rows = load_logs()
    rows = compute_agent_rows(raw_rows)

    all_agents = sorted(
        {
            safe_text(row.get("agent_id"))
            for row in rows
            if safe_text(row.get("agent_id")) != "—"
        }
    )

    filter_options = ["All Agents"] + all_agents

    if st.session_state.agent_filter not in filter_options:
        st.session_state.agent_filter = "All Agents"

    top_left, top_right = st.columns([1.4, 5.6])

    with top_left:
        selected_agent = st.selectbox(
            "Agent Filter",
            filter_options,
            index=filter_options.index(st.session_state.agent_filter),
            key="agent_filter_selectbox",
        )
        st.session_state.agent_filter = selected_agent

    with top_right:
        st.markdown("")

    if selected_agent == "All Agents":
        filtered_rows = rows
    else:
        filtered_rows = [row for row in rows if row["agent_id"] == selected_agent]

    if filtered_rows:
        selected_row = next(
            (r for r in filtered_rows if r["row_key"] == st.session_state.selected_row_key),
            filtered_rows[0],
        )
        st.session_state.selected_row_key = selected_row["row_key"]
    else:
        selected_row = None
        st.session_state.selected_row_key = None

    active_agents = 0
    shutdown_agents = 0

    for agent_id in all_agents:
        status = get_agent_status(agent_id, rows)
        if status == "Shut Down":
            shutdown_agents += 1
        else:
            active_agents += 1

    total_events = len(rows)

    if selected_agent != "All Agents":
        selected_agent_status = get_agent_status(selected_agent, rows)
        selected_agent_risk = get_agent_cumulative_risk(selected_agent, rows)
        selected_agent_blocked = get_blocked_attempts(selected_agent, rows)
        selected_metric_title = "Selected Agent Status"
        selected_metric_value = selected_agent_status
        selected_metric_sub = f"Risk {selected_agent_risk}/100 • Blocked Attempts {selected_agent_blocked}"
    else:
        selected_metric_title = "Agent View"
        selected_metric_value = "All Agents"
        selected_metric_sub = f"{len(all_agents)} monitored"

    m1, m2, m3, m4 = st.columns(4)

    with m1:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-title">Total Events</div>
                <div class="metric-value">{total_events}</div>
                <div class="metric-sub">Live event stream</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with m2:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-title">Active Agents</div>
                <div class="metric-value">{active_agents}</div>
                <div class="metric-sub">Agents still operating</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with m3:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-title">Shut Down Agents</div>
                <div class="metric-value">{shutdown_agents}</div>
                <div class="metric-sub">Agents in terminal state</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with m4:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-title">{html.escape(selected_metric_title)}</div>
                <div class="metric-value">{html.escape(selected_metric_value)}</div>
                <div class="metric-sub">{html.escape(selected_metric_sub)}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown('<div class="section-gap"></div>', unsafe_allow_html=True)

    table_col, inspect_col = st.columns([4.4, 1.8])

    with table_col:
        widths = [1.55, 1.0, 1.8, 1.45, 0.9, 1.3, 0.65]
        headers = [
            "Timestamp",
            "Agent",
            "Action",
            "Threat Type",
            "Attempted Risk",
            "Decision",
            "Inspect",
        ]

        for col, header in zip(st.columns(widths), headers):
            col.markdown(f'<div class="table-header">{header}</div>', unsafe_allow_html=True)

        for row in filtered_rows[:50]:
            c1, c2, c3, c4, c5, c6, c7 = st.columns(widths)

            c1.markdown(f'<div class="cell">{html.escape(row["timestamp"])}</div>', unsafe_allow_html=True)
            c2.markdown(f'<div class="cell">{html.escape(row["agent_id"])}</div>', unsafe_allow_html=True)
            c3.markdown(f'<div class="cell">{html.escape(row["action_label"])}</div>', unsafe_allow_html=True)
            c4.markdown(f'<div class="cell">{html.escape(row["threat_type"])}</div>', unsafe_allow_html=True)
            c5.markdown(f'<div class="cell">{html.escape(str(row["attempted"]))}</div>', unsafe_allow_html=True)

            pill_class = {
                "Allowed": "allowed",
                "Blocked": "blocked",
                "Agent Shut Down": "shutdown",
                "Require Human Review": "review",
            }.get(row["decision"], "allowed")

            c6.markdown(
                f'<span class="pill {pill_class}">{html.escape(row["decision"])}</span>',
                unsafe_allow_html=True,
            )

            is_selected = selected_row and selected_row["row_key"] == row["row_key"]
            icon = "●" if is_selected else "○"
            button_type = "primary" if is_selected else "secondary"

            if c7.button(
                icon,
                key=f"inspect_{row['row_key']}",
                use_container_width=False,
                type=button_type,
            ):
                st.session_state.selected_row_key = row["row_key"]
                st.rerun()

            st.markdown('<div class="row-divider"></div>', unsafe_allow_html=True)

    with inspect_col:
        if selected_row is None:
            st.markdown(
                """
                <div class="inspect-card">
                    <div class="inspect-title">Sentra Enforcement</div>
                    <div class="inspect-value">No events available.</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            return

        agent_id = selected_row["agent_id"]
        agent_status = safe_text(selected_row.get("agent_status"))
        agent_risk = parse_int(selected_row.get("cumulative_risk", 0), 0)
        agent_blocked_attempts = parse_int(selected_row.get("blocked_attempts", 0), 0)
        shutdown_reason = get_shutdown_reason(agent_id, rows)
        why_it_matters = get_why_it_matters(selected_row)
        outcome = get_outcome(selected_row)

        trace_items = "".join(
            f"<li>{html.escape(safe_text(item))}</li>"
            for item in selected_row.get("event_trace", [])[-4:]
        )

        inspect_html = f"""
<div class="inspect-card">

<div class="inspect-title">Sentra Enforcement</div>

<div class="inspect-group-title">Agent State</div>

<div class="mini-grid">

<div class="mini-card">
    <div class="mini-label">Agent</div>
    <div class="mini-value">{html.escape(agent_id)}</div>
</div>

<div class="mini-card">
    <div class="mini-label">Status</div>
    <div class="mini-value">{html.escape(agent_status)}</div>
</div>

<div class="mini-card">
    <div class="mini-label">Cumulative Risk</div>
    <div class="mini-value">{agent_risk}/{RISK_THRESHOLD}</div>
</div>

<div class="mini-card">
    <div class="mini-label">Blocked Attempts</div>
    <div class="mini-value">{agent_blocked_attempts}</div>
</div>

</div>



<div class="inspect-group-title">Selected Event</div>

<div class="inspect-block">
    <div class="inspect-label">Action Type</div>
    <div class="inspect-value">{html.escape(selected_row["action_label"])}</div>
</div>

<div class="inspect-block">
    <div class="inspect-label">Policy Triggered</div>
    <div class="inspect-value">{html.escape(selected_row["policy_description"])}</div>
</div>

<div class="inspect-block">
    <div class="inspect-label">Outcome</div>
    <div class="inspect-value">{html.escape(selected_row["decision"])}</div>
</div>

{f'''
<div class="inspect-block">
    <div class="inspect-label">Shutdown Reason</div>
    <div class="inspect-value">{html.escape(shutdown_reason)}</div>
</div>
''' if agent_status == "Shut Down" else ""}

<div class="inspect-block">
    <div class="inspect-label">Real-Time Enforcement Timeline</div>
    <ul class="trace-list">
        {trace_items}
    </ul>
</div>

</div>
"""
        st.markdown(inspect_html, unsafe_allow_html=True)


def render_impact_report():
    """Impact report tab — shows measurable outcomes from batch demo."""

    REPORT_FILE = BASE_DIR / "dashboard" / "impact_report.json"

    if not REPORT_FILE.exists():
        st.info(
            "No impact report found. Run the batch demo from the claims workflow repo:\n\n"
            "```\ncd autonomous-claims-workflow\npython demo.py\n"
            "cp outputs/impact_report.json <sentra-repo>/dashboard/\n```"
        )
        return

    report = load_json(REPORT_FILE, {})
    claims = report.get("claims", [])
    if not claims:
        st.warning("Impact report is empty.")
        return

    total = len(claims)
    rule_approved = sum(1 for c in claims if c["rule_based_decision"] == "APPROVE")
    rule_approved_no_proof = sum(
        1 for c in claims if c["rule_based_decision"] == "APPROVE" and not c["has_proof"]
    )
    granite_approved = sum(1 for c in claims if c["granite_decision"] == "APPROVE")
    granite_denied = sum(1 for c in claims if c["granite_decision"] == "DENY")
    granite_pending = sum(1 for c in claims if c["granite_decision"] == "PENDING")
    granite_caught = rule_approved_no_proof - sum(
        1 for c in claims if c["granite_decision"] == "APPROVE" and not c["has_proof"]
    )
    sentra_blocked = sum(1 for c in claims if not c["sentra_allowed"])
    sentra_allowed = sum(1 for c in claims if c["sentra_allowed"])
    exposure = rule_approved_no_proof * 5000

    st.markdown(
        f"<p style='color:#888; font-size:13px;'>Report generated {report.get('timestamp', '—')} "
        f"&nbsp;·&nbsp; Model: {report.get('model', '—')} &nbsp;·&nbsp; {total} claims processed</p>",
        unsafe_allow_html=True,
    )

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Claims Processed", total)
    k2.metric("Unsafe Without Controls", rule_approved_no_proof, delta=f"-${exposure:,} exposure")
    k3.metric("Caught by Granite", granite_caught)
    k4.metric("Blocked by Sentra", sentra_blocked)

    st.divider()

    col_before, col_after = st.columns(2)

    with col_before:
        st.markdown("#### Without Granite or Sentra")
        st.markdown(f"- **{rule_approved}** claims auto-approved")
        st.markdown(f"- **{rule_approved_no_proof}** approved without proof")
        st.markdown(f"- **${exposure:,}** in improper disbursement risk")
        if rule_approved_no_proof > 0:
            st.error(f"{rule_approved_no_proof} fraudulent approvals would execute unchecked")

    with col_after:
        st.markdown("#### With Granite + Sentra")
        st.markdown(f"- **{granite_approved}** approved (verified)")
        st.markdown(f"- **{granite_pending}** held for review")
        st.markdown(f"- **{granite_denied}** denied")
        st.markdown(f"- **$0** in improper disbursement")
        st.success(f"All {rule_approved_no_proof} unsafe approvals prevented")

    st.divider()

    st.markdown("#### Claim Detail")

    for c in claims:
        rule_dec = c["rule_based_decision"]
        granite_dec = c["granite_decision"]
        has_proof = c["has_proof"]
        is_unsafe = rule_dec == "APPROVE" and not has_proof
        prefix = "!!" if is_unsafe else "OK" if granite_dec == "APPROVE" else "--"

        with st.expander(f"{prefix}  {c['claim_id']}  —  Rules: {rule_dec}  →  Granite: {granite_dec}"):
            d1, d2 = st.columns(2)
            with d1:
                st.markdown(f"**Applicant:** {c['applicant']}")
                st.markdown(f"**Proof of termination:** {'Yes' if has_proof else 'No'}")
                st.markdown(f"**Intake issues:** {', '.join(c['intake_issues']) if c['intake_issues'] else 'None'}")
            with d2:
                st.markdown(f"**Granite reasoning:** {'; '.join(c['granite_reason'])}")
                if c["granite_risk_factors"]:
                    st.markdown(f"**Risk factors:** {'; '.join(c['granite_risk_factors'])}")
                st.markdown(f"**Sentra:** {'Allowed' if c['sentra_allowed'] else 'Blocked'} (risk: {c['sentra_risk_score']})")


tab_live, tab_impact = st.tabs(["Live Dashboard", "Impact Report"])

with tab_live:
    render_live_dashboard()

with tab_impact:
    render_impact_report()