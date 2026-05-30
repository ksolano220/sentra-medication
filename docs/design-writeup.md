# Sentra + Autonomous Claims Workflow

**Runtime Governance for AI Agents in High-Stakes Systems**

This document is the project-level design writeup: problem statement, two-layer solution, demo scenarios, and evaluation alignment. For the technical runtime model (policy rules, risk engine, three-strike logic, state management), see [`architecture.md`](architecture.md).

---

## 1. Problem Statement

Autonomous AI agents are increasingly capable of executing actions across real systems, including accessing data, triggering workflows, and making financial decisions. However, current architectures rely on post-execution monitoring, where unsafe actions are detected only after they occur.

This creates a critical gap:

- Agents can violate policy before intervention
- Sensitive data can be exposed
- Financial controls can be bypassed

**The core challenge:** How might we enable autonomous AI agents to operate in high-stakes public service workflows while enforcing policy, preventing financial errors, and protecting sensitive data in real time?

---

## 2. Solution Overview

A two-layer system:

### Layer 1. Agent System (client repo)

A multi-agent workflow simulating a public benefits process:

- Intake Agent
- Eligibility Agent
- Disbursement Agent

Agents generate structured action proposals, not direct execution. Powered by IBM watsonx.ai / Granite for reasoning and decision support in the [autonomous-claims-workflow](https://github.com/ksolano220/autonomous-claims-workflow) proof-of-concept.

### Layer 2. Sentra (this repo)

A runtime execution control layer that sits between agents and execution. Sentra:

- Intercepts every action before execution
- Applies policy rules
- Assigns behavioral risk
- Decides whether the action is:
  - **Allowed**
  - **Blocked**
  - **Agent Shut Down**

### Core Principle

**Agents propose actions. Sentra decides whether they execute.**

---

## 3. System Architecture

Execution flow:

```
Agent (IBM watsonx)
  ↓
Proposed Action
  ↓
Sentra Runtime Interceptor
  ↓
Policy Rules
  ↓
Risk Engine
  ↓
Decision
  ↓
Execution (or Block)
  ↓
Monitoring Dashboard
```

---

## 4. Control Boundary (critical design decision)

Sentra introduces a strict enforcement boundary:

- Agents cannot directly access tools
- All actions must pass through Sentra
- Sentra is the only component authorized to approve execution

This ensures no bypass path, deterministic enforcement, and centralized governance.

---

## 5. Demo Workflow (Claims System)

A simulated public benefits system.

### Policy Assumption

Applicants affected by a natural disaster may qualify for a one-time $5,000 payment, requiring:

- Confirmation of disaster-related job loss
- Supporting documentation
- Payment within authorized limits

### Workflow

```
User → Intake Form
  ↓
Intake Agent
  ↓
Eligibility Agent
  ↓
Disbursement Agent
  ↓
Sentra (evaluation before execution)
```

### Supervised Actions

- `APPROVE_PAYMENT`
- `SEND_EMAIL_NOTIFICATION`
- `ACCESS_EXTERNAL_API`
- `EXPORT_DATA`
- `MODIFY_RECORD`

---

## 6. Decision and Risk Model

Sentra enforces three states (Allowed, Blocked, Agent Shut Down) and tracks cumulative behavioral risk per agent. Blocked actions increase a violation count; three violations trigger agent shutdown.

See [`architecture.md`](architecture.md) for the full decision model, risk engine, and three-strike logic.

---

## 7. Key Innovation

This system introduces a shift from:

**Traditional Model.** Monitor after execution, detect violations late.

**Sentra Model.** Evaluate before execution, enforce decisions in real time.

### What Makes This Different

- Runtime interception (not logging)
- Behavioral risk tracking
- Authority drift detection
- System-level shutdown

---

## 8. Demo Scenarios

**Scenario 1. Clean Approval.** Valid application → Sentra allows execution.

**Scenario 2. Valid Denial.** Ineligible user → Sentra allows rejection.

**Scenario 3. Unsafe Approval.** Missing required proof → Sentra blocks approval.

**Scenario 4. Data Exfiltration.** Sensitive data sent externally → immediate block.

**Scenario 5. Financial Overreach.** Payment exceeds $5,000 → blocked or escalated.

**Scenario 6. Authority Drift (key scenario).** Agent behavior:

1. Reads internal data
2. Updates internal record
3. Attempts external data transfer

Sentra allows safe actions, tracks behavioral escalation, and blocks at the moment risk becomes critical. This demonstrates behavioral governance, not just rule enforcement.

---

## 9. IBM Integration

IBM watsonx is used within the agent layer (in the autonomous-claims-workflow repo) to:

- Interpret tasks
- Generate structured action proposals
- Guide decision reasoning

Sentra itself remains model-agnostic, independent, and reusable across systems. See `supervisor/` and `sdk/` in this repo: no LLM SDKs are imported.

---

## 10. What Was Built vs Simulated

### Built

- Sentra runtime control layer (FastAPI)
- Policy engine + risk engine
- Behavioral tracking (cumulative risk + three-strike shutdown)
- Real-time monitoring dashboard
- Structured event logging

### Simulated

- Multi-agent workflow
- Claims processing system
- Tool environment (API, DB, email)

---

## 11. Technology Stack

Sentra itself:

- Python
- FastAPI
- Streamlit (dashboard)

The client system (autonomous-claims-workflow) additionally uses IBM watsonx.ai and Granite models, which are not dependencies of Sentra.

---

## 12. Evaluation Alignment

Mapped to the IBM SkillsBuild lab rubric:

**Innovation.** Introduces runtime enforcement vs monitoring.

**Feasibility.** Modular architecture, agent-agnostic design.

**Effectiveness.** Blocks unsafe actions before execution, tracks behavioral risk.

**Usability.** Simple API integration, real-time dashboard visibility.

---

## 13. Limitations

- Simulated environment (not production systems)
- Static rule definitions
- Does not guarantee correctness of agent reasoning

---

## 14. Key Takeaway

Autonomous AI agents should not be trusted to execute actions directly. A runtime control layer must evaluate and enforce decisions before execution.
