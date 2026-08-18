# Sentra Medication

**Independent runtime governance for AI-assisted medication management.**

Sentra is middleware that sits between an AI prescription system and execution. It intercepts every AI-generated medication order, validates it against live patient data fetched from the Electronic Patient Record (EPR) via FHIR R4, and returns **allow / block / escalate** in under 100 milliseconds, before the order ever reaches the pharmacy.

NYU SPS Berlin GFI 2026 · Group 3. Presented to **Google** and **Join Capital**, and **won the final pitch** before a faculty panel. Adapted from [ksolano220/sentra](https://github.com/ksolano220/sentra).

→ Full business case: [docs/business-case.md](docs/business-case.md) · Pitch + Q&A: [docs/pitch-script.md](docs/pitch-script.md)

**Governance walkthrough:**

https://github.com/ksolano220/sentra-medication/raw/main/assets/sentra-governance-demo.mp4

## Team

NYU SPS Berlin Global Field Intensive 2026, Group 3.

- **Katherine Solano**, Team Lead
- **Karla Ladd** ([kl5364@nyu.edu](mailto:kl5364@nyu.edu))
- **Fizza Naqvi** ([fsn220@nyu.edu](mailto:fsn220@nyu.edu))
- **Jovan Diaz** ([jd6513@nyu.edu](mailto:jd6513@nyu.edu))

---

## What this is

Hospitals are handing prescription decisions to AI systems with no real-time governance layer watching over them, exactly as the EU AI Act makes human oversight of high-risk healthcare AI mandatory (effective August 2, 2026; penalties up to €15M or 3% of global turnover). Current governance is reactive: static policies, manual reviews, post-incident analysis. Nothing in the stack intercepts an unsafe AI action *before* it reaches the pharmacy, and traditional cybersecurity protects users, devices, and networks but does not monitor AI decisions in real time.

Sentra is that missing layer. It is **independent by design**: it does not sit inside the AI tool, because an AI system governing its own outputs is grading its own homework. It sits between the AI and execution, validates against the patient's actual EPR record (not the model's internal logic), and produces an audit log that doubles as legal evidence of human oversight. The independence also creates clean liability separation between the AI vendor, Sentra, and the hospital.

Five functions:

- **Real-time interception** — every AI medication order is caught before it executes or transmits downstream.
- **Live EPR validation** — checked against live patient data via FHIR R4, not stale or cached records.
- **Behavioral risk scoring** — cumulative per-agent risk across actions, not order-by-order.
- **Runtime intervention** — allow / block / escalate; escalations are risk-scored to fight alert fatigue and halt until a clinician explicitly signs off.
- **Auditability** — every action, block, escalation, and override logged, timestamped, and traceable, as EU AI Act human-oversight evidence.

---

## Project status

Academic sprint repo for the NYU SPS Berlin GFI 2026 fellowship. Working MVP, open-sourced.

### Built and working

- Deterministic policy rules engine ([`supervisor/rules.py`](supervisor/rules.py))
- Cumulative per-agent risk + three-strike progressive escalation ([`supervisor/risk.py`](supervisor/risk.py))
- EU AI Act Article-12-shaped audit log with `rule_id`, `rule_version`, `policy_hash`, `inputs_sha256`, statutory `citation` per event ([`supervisor/storage.py`](supervisor/storage.py))
- Mock FHIR `/fhir/Patient/{id}` endpoint with canned demo patients ([`supervisor/mock_fhir.py`](supervisor/mock_fhir.py))
- Python SDK with `evaluate()` + `@guard` decorator + medication-aware payload fields ([`sdk/client.py`](sdk/client.py))
- Streamlit monitoring dashboard, light mode + green accent ([`dashboard/app.py`](dashboard/app.py))
- **Two clinical rules wired end-to-end:**
  - Methotrexate frequency mismatch (ECRI canonical hallucination: 25mg daily, correct is weekly)
  - Allergy interaction with drug-family expansion (penicillin → amoxicillin, ampicillin, etc.)
- **Two demo scripts that run end-to-end:**
  - [`demo/methotrexate_scenario.py`](demo/methotrexate_scenario.py)
  - [`demo/allergy_scenario.py`](demo/allergy_scenario.py)

### Roadmap (clearly labelled, NOT built)

- **Patient identity verification** — wrong-patient order detection
- **Drug-drug interaction checks**
- **EPR consistency validation** — stale / conflicting record detection
- **Live FHIR R4 integration with production EPRs** (Epic, Oracle Health, CompuGroup Medical) via SMART on FHIR + OAuth 2.0
- **Epic Marketplace certification** — FHIR R4 + SMART on FHIR compliance, OAuth 2.0 security validation, sandbox testing
- **EU AI Act conformity assessment** via an accredited EU Notified Body (e.g., TÜV SÜD)
- **Agent State Continuity** (quality-scored checkpoint/restore on drift): extension of the three-strike pattern that snapshots agent context at the last good point and restores onto a fresh agent so handoff continuity is preserved without bad-state contamination

---

## Quick start

```bash
git clone git@github.com:ksolano220/sentra-medication.git
cd sentra-medication
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### Run the supervisor + dashboard locally

Three terminals:

```bash
# Terminal 1: supervisor
.venv/bin/uvicorn supervisor.main:app --reload

# Terminal 2: dashboard
.venv/bin/streamlit run dashboard/app.py

# Terminal 3: demo
.venv/bin/python demo/methotrexate_scenario.py
.venv/bin/python demo/allergy_scenario.py
```

Dashboard opens at `http://localhost:8501`. Supervisor at `http://127.0.0.1:8000`. Run the demo scripts and watch audit rows appear live in the dashboard.

---

## Architecture

Out-of-process Python service. Agents call Sentra via HTTP before executing any action; Sentra evaluates against the clinical rule pack, tracks cumulative session risk, and returns allow / block / escalate. All decisions land in a tamper-evident audit log.

```
agent  →  Sentra SDK  →  supervisor/main.py  →  rules.py  →  risk.py
                                            ↓
                                       storage.py
                                            ↓
                                  runtime_log.json  →  dashboard
```

- [`supervisor/main.py`](supervisor/main.py): FastAPI server. `/agent-action` evaluates a proposed action. `/fhir/Patient/{id}` serves the mock EPR data the agent fetches before proposing. `/events` returns the audit log. `/reset` clears state for demos.
- [`supervisor/rules.py`](supervisor/rules.py): the Python rule chain. Add clinical rules here. Each rule emits a `_build_result` carrying decision + policy_triggered + reason + citation + Article-12 audit fields.
- [`supervisor/risk.py`](supervisor/risk.py): cumulative-risk math + three-strike shutdown. This is the behavioral primitive a stateless policy kernel does not ship.
- [`supervisor/storage.py`](supervisor/storage.py): JSON event log + per-agent state.
- [`supervisor/mock_fhir.py`](supervisor/mock_fhir.py): simulated EPR endpoint. In production this is the hospital's EPR via FHIR R4 (Epic, Oracle Health, CompuGroup Medical).
- [`sdk/client.py`](sdk/client.py): drop-in Python SDK. Fail-safe blocks on unreachable server.
- [`dashboard/app.py`](dashboard/app.py): Streamlit dashboard. Reads the event log, surfaces live intercepts with the audit row inspector.

### What an audit row looks like

```json
{
  "timestamp": "2026-05-30 17:20:27",
  "agent_id": "clinical-ai-demo-001",
  "action_type": "PRESCRIBE_MEDICATION",
  "action_label": "Prescribe 25mg Methotrexate daily",
  "decision": "Blocked",
  "policy_triggered": "BLOCK_METHOTREXATE_FREQUENCY_MISMATCH",
  "reason": "Methotrexate at daily frequency is contraindicated. Correct schedule is weekly. Sustained daily administration causes severe toxicity.",
  "rule_id": "BLOCK_METHOTREXATE_FREQUENCY_MISMATCH",
  "rule_version": "1.0.0",
  "policy_hash": "b3ad16c078d02959",
  "inputs_sha256": "e71fbc57eae17b76",
  "citation": "ECRI 2025-2026 Top 10 Health Tech Hazards (canonical LLM medication-hallucination example); EU AI Act Article 14(4)(d) interrupt-via-stop-button."
}
```

Every blocked event carries `rule_id`, `rule_version`, `policy_hash` (stable SHA of `rules.py` at deploy time), `inputs_sha256` (deterministic hash of the action payload), and a statutory `citation`. This is the Article-12 deployer-side traceability substrate.

---

## Regulatory posture

**Sentra is not a medical device.** It does not diagnose, prescribe, or recommend. It expresses hospital-authored policy on actions of agents that do, and produces audit records. This keeps it outside MDR conformity scope. The agents Sentra gates are in MDR scope; Sentra is deployer-side governance infrastructure.

Sentra operationalises specific EU AI Act articles. It does not deliver wholesale "AI Act compliance":

- **Article 12** (automatic logging): the regulation explicitly requires automatic event logging by the system itself, manual logs do not satisfy. Sentra is Article-12-grade by construction.
- **Article 14(4)(d)** (interrupt via stop button): the pre-execution block.
- **Article 14(4)(e)** (override / reverse): allow / escalate routes.
- **Article 26(5)** (deployer log retention ≥6 months): the audit log shape supports it.

High-risk classification pathway for medication AI: **Article 6(1) + Annex I via MDR Annex VIII Rule 11** (medicine dosage calculator is the textbook Class IIa example). NOT Annex III point 5(a).

Enforcement timeline: Aug 2, 2026 (Annex III + Article 26 deployer duties) · Aug 2, 2027 (Article 6(1) MDR-embedded) · Aug 2, 2028 (Council March 2026 agreement moved Annex I medical devices).

Penalty ceiling: €15M or 3% of global annual turnover.

Citation: [MDCG 2025-6 / AIB 2025-1](https://health.ec.europa.eu/document/download/b78a17d7-e3cd-4943-851d-e02a2f22bbb4_en?filename=mdcg_2025-6_en.pdf) (June 2025), Interplay between the MDR & IVDR and the AI Act.

MDR + AI Act apply concurrently to the agents Sentra gates. Hospital deployers still own Article 9 risk management, Article 10 data governance, Article 27 FRIA, GDPR Article 9(2)(h) basis, and DPIA. Sentra provides the auditable substrate those documents reference.

---

## Context

NYU SPS Berlin GFI 2026 group project, Group 3 (see [Team](#team)). Presented to Google and Join Capital; won the final pitch before a faculty panel.

Pitch and design artifacts live in `docs/`:

- [`business-case.md`](docs/business-case.md): the full written business case
- [`pitch-script.md`](docs/pitch-script.md): the spoken pitch (4 speakers) + rehearsed panel Q&A
- [`architecture.md`](docs/architecture.md), [`threat_model.md`](docs/threat_model.md), [`decision_framework.md`](docs/decision_framework.md), [`three-strike-walkthrough.md`](docs/three-strike-walkthrough.md): design write-ups

---

## Provenance

Adapted from [ksolano220/sentra](https://github.com/ksolano220/sentra), first commit **February 27, 2026**. The core supervisor + rules + risk + three-strike engine was committed by **March 12, 2026**. Originally built for IBM SkillsBuild's AI Experiential Learning Lab, where it received the following mentor recognition:

> "Amazing idea implementation. Good job, and great work on the project."
> *IBM Mentor, SkillsBuild AI Experiential Learning Lab*

---

## License

[MIT](LICENSE). Copyright (c) 2026 Katherine Solano, Karla Ladd, Fizza Naqvi, Jovan Diaz.
