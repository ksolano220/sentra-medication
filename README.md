# Sentra Medication

**Clinical content layer for runtime AI governance in medication management workflows.**

NYU SPS Berlin GFI 2026 · Group 3 · adaptation of [ksolano220/sentra](https://github.com/ksolano220/sentra).

---

## What this is

Microsoft open-sourced the [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) on April 2, 2026: sub-millisecond pre-execution action interception, OPA Rego + Cedar + YAML policies, EU AI Act + HIPAA mapping. That is the generic plumbing for runtime AI governance.

Sentra Medication is not a competing plumbing layer. It is the **clinical content layer** that sits on top of (or alongside) that plumbing. The toolkit ships interception. Sentra ships the medication rule pack, the Article-12-shaped clinical audit format, and the medication-aware progressive escalation behavior.

| | Microsoft Agent Governance Toolkit | Sentra Medication |
|---|---|---|
| Layer | Generic plumbing | Clinical content + behavior |
| Policy expression | YAML, OPA Rego, Cedar | Clinical rule pack (frequency mismatch, allergy conflict, dose range, drug-drug, formulary) |
| Audit log | Hash-chained policy events with OpenTelemetry spans | Article-12-shaped audit row with statutory citation per event |
| Behavioral state | Stateless by design | Cumulative per-agent risk + three-strike progressive escalation (silent log → pharmacist co-sign → agent suspension) |
| Clinical domain knowledge | None (by design) | Fachinformationen, AkdÄ guidance, ECRI canonical failure modes |
| Who builds it | Microsoft | Hospital deployers + clinical partners |

**Microsoft solved interception. Sentra solved the clinic.**

---

## Project status

**This is an academic sprint repo for the NYU SPS Berlin GFI 2026 fellowship.** Read [docs/berlin-sprint-plan.md](docs/berlin-sprint-plan.md) and [docs/microsoft-toolkit-comparison.md](docs/microsoft-toolkit-comparison.md) before contributing.

### Built and working

- Deterministic policy rules engine ([`supervisor/rules.py`](supervisor/rules.py))
- Cumulative per-agent risk + three-strike progressive escalation ([`supervisor/risk.py`](supervisor/risk.py))
- Article-12-shaped audit log with `rule_id`, `rule_version`, `policy_hash`, `inputs_sha256`, statutory `citation` per event ([`supervisor/storage.py`](supervisor/storage.py))
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

- Native middleware integration with the Microsoft Agent Governance Toolkit (sidecar webhook pattern, see [docs/microsoft-toolkit-comparison.md](docs/microsoft-toolkit-comparison.md))
- Azure Health Data Services integration via FHIR R4
- Microsoft Purview AI Hub audit export
- Azure Marketplace transactable offer via ISV Success
- Upstream PR contributing a `clinical-medication-governed` example to the MS toolkit
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
- [`supervisor/risk.py`](supervisor/risk.py): cumulative-risk math + three-strike shutdown. **This is the behavioral primitive Microsoft's stateless kernel does not ship.**
- [`supervisor/storage.py`](supervisor/storage.py): JSON event log + per-agent state.
- [`supervisor/mock_fhir.py`](supervisor/mock_fhir.py): simulated EPR endpoint. In production this would be Azure Health Data Services (FHIR R4) or the hospital's actual EPR.
- [`sdk/client.py`](sdk/client.py): drop-in Python SDK. Fail-safe blocks on unreachable server.
- [`dashboard/app.py`](dashboard/app.py): Streamlit dashboard. Reads the event log, surfaces live intercepts with the audit row inspector.

### What an audit row looks like

```json
{
  "timestamp": "2026-05-30 17:20:27",
  "agent_id": "dragon-copilot-demo-001",
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

NYU SPS Berlin GFI 2026 group project, Group 3. Built to be presented to Microsoft Berlin during the fellowship week. The pitch positions Sentra as a clinical-domain partner offering that plugs into the Microsoft Agent Governance Toolkit for the medication vertical.

Pitch artifacts live in `docs/`:

- [`berlin-sprint-plan.md`](docs/berlin-sprint-plan.md): positioning, verbatim slide revisions, 5-day sprint plan
- [`microsoft-toolkit-comparison.md`](docs/microsoft-toolkit-comparison.md): architecture comparison + 5 integration patterns + sprint recommendation
- [`pitch-deck.md`](docs/pitch-deck.md): 10 slides with speaker notes and visual instructions
- [`qa-rehearsal.md`](docs/qa-rehearsal.md): 8 rehearsed Q&A answers + 3 bonus questions
- [`demo-narration.md`](docs/demo-narration.md): 90-second verbatim presenter script + recovery plan

---

## Provenance

Adapted from [ksolano220/sentra](https://github.com/ksolano220/sentra), first commit **February 27, 2026**. The core supervisor + rules + risk + three-strike engine was committed by **March 12, 2026**, five weeks before the Microsoft Agent Governance Toolkit was open-sourced on April 2, 2026. Convergent design, not derivative. Receipts in the original repo's commit history.

The original project was built for IBM SkillsBuild's AI Experiential Learning Lab and received the following mentor recognition:

> "Amazing idea implementation. Good job, and great work on the project."
> *IBM Mentor, SkillsBuild AI Experiential Learning Lab*

---

## License

MIT.
