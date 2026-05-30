# Berlin Sprint Plan: Sentra Medication

NYU SPS Group 3 → Microsoft Berlin → GFI 2026
Sprint window: 5 working days

This doc is the output of a multi-agent research + adversarial review pass on the original pitch. Read top to bottom before touching deck or code.

---

## Positioning (read first)

Microsoft open-sourced the **Agent Governance Toolkit on April 2, 2026**: sub-millisecond pre-execution action interception, OPA Rego + Cedar policy languages, EU AI Act + HIPAA mapping. That is the **generic plumbing** for runtime AI governance.

**Sentra is not a competing plumbing layer. Sentra is the clinical content layer that sits on top of (or alongside) that plumbing.**

| | Microsoft Agent Governance Toolkit | Sentra |
|---|---|---|
| Layer | Generic plumbing | Clinical content + behavior |
| Policy language | YAML, OPA Rego, Cedar | Clinical rule pack (dose-range, frequency-mismatch, drug-drug, allergy, formulary) |
| Audit log | Generic policy event | Article-12-shaped clinical audit with statutory citation per event |
| Escalation | Allow / block | Progressive ladder: silent log → pharmacist co-sign → agent suspension |
| Domain knowledge | None (by design) | Fachinformationen, AkdÄ guidance, ECRI canonical failure modes |
| Who builds it | Microsoft | Hospital deployers + clinical partners like NYU Group 3 |

**Microsoft solved interception. Sentra solved the clinic.**

### Priority-of-invention note (have it ready, don't lead with it)

Sentra's first commit is **February 27, 2026**. The core supervisor + rules + risk + three-strike engine were committed by **March 12, 2026**: five-plus weeks before Microsoft published. Independent convergent design. Receipts in the `ksolano220/sentra` commit history. Use this quietly if anyone implies Sentra is downstream of Microsoft's toolkit.

---

## Critical findings (the rest)

1. **Charité is a Microsoft Dragon Copilot launch customer since March 31, 2025**, GA across Germany October 7, 2025, championed by Microsoft Germany CEO Agnes Heftberger. That is your pitch opener.
2. **Charité has NOT deployed Epic yet.** Contract signed Dec 2025, rollout target end-2029. They currently run Oracle Cerner i.s.h.med. "Live EPR validation" against Charité is fiction in May 2026.
3. **Regulatory framing in the original pitch is imprecise.** Routine in-hospital medication AI is high-risk via Article 6(1) + Annex I (MDR safety-component pathway), not Annex III point 5(a). Dates: Aug 2, 2026 (Annex III + Article 26 deployer duties), Aug 2, 2027 (Article 6(1) MDR-embedded), Aug 2, 2028 (Council March 2026 agreement moved Annex I medical devices). Cite MDCG 2025-6 / AIB 2025-1 (June 2025) on the MDR + AI Act interplay.
4. **Cut Phase 2 + Phase 3 to roadmap.** Ship ONE rule end-to-end (methotrexate 25mg daily = ECRI's canonical hallucination), plus one second rule (allergy interaction) for generality optics. 90-second live demo.

---

## Top fixes (severity-ordered)

### Critical

1. **Reframe Sentra as the clinical content layer**, not a competing governance platform. Microsoft owns the plumbing. We own the clinical knowledge, audit format, and medication-aware escalation behavior. This is the whole pitch.
2. **Name Microsoft, Dragon Copilot, Agent Framework, Azure AI Content Safety, Healthcare Agent Service, Purview, and the Agent Governance Toolkit in the deck.** Open with Charité's Dragon Copilot relationship. The original deck never says "Microsoft" once.
3. **Acknowledge the Agent Governance Toolkit head-on on slide 2.** Don't ignore it, don't compete with it. Position Sentra as the clinical specialization that runs on top of (or alongside) it. Microsoft strategists reward teams that have read their own roadmap.
4. **Drop "live EPR validation."** Reframe as EHR-agnostic policy gate against a simulated FHIR endpoint, designed for Azure Health Data Services in production.
5. **Replace generic "aligned with EU AI Act + GDPR"** with specific Article hooks: Article 12 automatic logging, Article 14(4)(d)-(e) intervention + override, Article 26(5) six-month deployer log retention. Get the high-risk pathway right (Article 6(1) + Annex I via MDR Annex VIII Rule 11, not Annex III 5(a)). Get the dates right.
6. **Cut Phase 2 + 3 from deliverables, reclass as roadmap.** Demo ONE rule end-to-end + one allergy rule for generality. Label everything else "reference scenarios for the pattern."

### High

7. **Add explicit "Sentra is NOT a medical device" line and one regulatory-status slide.** Position as deployer-side governance content that does not generate clinical recommendations, only enforces hospital-authored policy on actions. Without this, a Notified Body reviewer can argue Sentra is itself an MDR safety component.
8. **Right-size the ask to four items** a Microsoft Berlin strategist can say yes to in week one: explore Sentra as a partner offering that plugs into the Agent Governance Toolkit for the medication vertical, Founders Hub credits ($150K Azure), intro to Charité Dragon Copilot pilot owner, Azure Marketplace + ISV Success fit review. Drop SaaS revenue model entirely.
9. **Reframe Charité as proposed research collaboration with CLAIM** (Z-Inspection methodology) and/or a TEF-Health testing slot, on synthetic data, with production pilot tied to the 2027-2029 Epic build-out. Cite HFrEF-Navigator as proof Charité already trusts deterministic medication-guideline AI.

---

## Verbatim revisions

### Executive summary

**Original:** "Sentra is a runtime governance and intervention platform for AI-assisted medication management in European healthcare. Real-time interception of AI medication actions, live EPR validation, behavioral risk scoring, runtime interventions. Aligned with EU AI Act + GDPR."

**Replacement:** "Microsoft open-sourced an Agent Governance Toolkit in April 2026 that solved generic runtime action interception for AI agents. Sentra is the clinical content layer that sits on top of it: a medication rule pack sourced from real clinical references, an Article-12-shaped audit log shaped for hospital deployers, and a medication-aware progressive escalation ladder. Built for the agents Dragon Copilot, Healthcare Agent Service, and the Microsoft Agent Framework are enabling in EU hospitals through 2027."

### Problem statement

**Original:** "Berlin hospitals (Charité) are deploying EPR + AI workflows under staffing pressure. Current AI governance is reactive (static policies, post-incident review). No runtime layer exists."

**Replacement:** "Charité is already a Microsoft Dragon Copilot launch customer (since March 2025, GA October 2025). Dragon Copilot writes the note. The next generation of agents (Healthcare Agent Service, Healthcare Agent Orchestrator, partner-marketplace agents from HIMSS 2026) will act on the patient record. ECRI ranked AI chatbot misuse the #1 healthcare hazard of 2025-2026; general LLMs fabricate medication info in roughly 1 of 7 medical documents; methotrexate 25mg daily instead of 25mg weekly is the published canonical failure. German hospitals already absorb ~4.5% inpatient ADE rates costing ~1.058B EUR/year. Microsoft solved the generic interceptor in April. What's still missing is the clinical content layer: the rules, the audit format, and the medication-aware behavior hospitals need to safely deploy these agents."

### Solution

**Original:** "Sentra sits between AI workflows and execution. Real-time interception, live EPR validation, behavioral risk scoring, runtime intervention (allow/block/escalate), audit logging."

**Replacement:** "Sentra is the clinical content layer for runtime AI governance. Where Microsoft's Agent Governance Toolkit provides the generic interceptor (OPA Rego, Cedar, sub-millisecond p99), Sentra provides the clinical rule pack (dose-range, frequency-mismatch, drug-drug interaction, allergy conflict, formulary), the Article-12-shaped audit log with statutory citation per event, and the medication-aware progressive escalation ladder (silent log → pharmacist co-sign → agent suspension) that maps to Article 14(4)(d)-(e) human oversight. No LLM in the decision path: reproducible, auditable, deterministic."

### Phases

**Original:** "Phase 1: Simulate AI prescription workflow, integrate EPR validation. Phase 2: Connect medication actions to Sentra, evaluate risk patterns. Phase 3: Demo dashboard with blocked + escalated medication actions."

**Replacement:** "Live demo today: A Microsoft Agent Framework agent proposes methotrexate 25mg DAILY (ECRI's canonical hallucination). Sentra's clinical rule pack intercepts pre-execution against a simulated FHIR/MedicationRequest endpoint, fires the dose-frequency rule, blocks the action, writes an Article-12-shaped audit row (rule_id, rule_version, policy_hash, inputs, SHA-256, timestamp, user, agent_id, citation), increments the session risk counter, and surfaces the event live in the dashboard. A second rule (allergy interaction) demonstrates the rule format is general. Roadmap (clearly labelled): medication rule library expansion, native integration with Microsoft Agent Governance Toolkit, Azure Health Data Services via FHIR R4, Purview AI Hub audit export, Azure Marketplace transactable offer via ISV Success, **Agent State Continuity** (quality-scored checkpoint/restore on drift: an extension of the three-strike pattern that snapshots agent context at the last good point, terminates the degrading instance, and restores onto a fresh agent so handoff continuity is preserved without bad-state contamination, a primitive the Microsoft toolkit is stateless-by-design and explicitly does not ship)."

### Risks

**Original:** "Risks acknowledged: false positives, integration complexity, explainability, evolving regulation, scalability, adoption resistance."

**Replacement:** "Operational honesty: false-positive load on the pharmacy is the actual deployment risk. We ship in 4-6 week silent shadow-mode by default, with per-rule sensitivity/specificity targets and a pharmacist override + feedback loop. Sentra is NOT a medical device: it does not diagnose, prescribe, or recommend. It expresses hospital-authored policy on actions of agents that do, and produces audit records, which keeps it outside MDR conformity scope (contrast: Bayesian Health's May 2026 FDA 510(k) for sepsis monitoring is a clinical-claim product; Sentra is a governance-claim product). MDR + AI Act apply concurrently to the agents Sentra gates (MDCG 2025-6 / AIB 2025-1, June 2025). Hospital still owns Article 9 risk management, Article 10 data governance, Article 27 FRIA, GDPR Article 9(2)(h) basis, and DPIA: Sentra provides the auditable substrate those documents reference."

### Ask

**Original:** "Business: hospitals, university medical centers, digital health vendors. SaaS + monitoring modules + compliance reporting."

**Replacement:** "Ask: (1) explore Sentra as a partner offering that plugs into the Microsoft Agent Governance Toolkit for the medication vertical, (2) Microsoft for Startups Founders Hub credits (up to $150K Azure over 4 years), (3) intro to the Charité Dragon Copilot pilot owner and a 30-min fit review with the Microsoft Berlin healthcare team at Unter den Linden 17, (4) Azure Marketplace + ISV Success fit review for a Sentra transactable offer."

### Architecture-fit line for the deck

"Sentra is a clinical-domain content pack for agents built on the Microsoft Agent Framework, designed to plug into the Microsoft Agent Governance Toolkit as the medication rule pack, consumes Azure AI Content Safety groundedness signals, writes audit events compatible with Microsoft Purview AI Hub, runs in Azure Germany regions for GDPR data residency, and is designed to ship as a transactable offer in Azure Marketplace via the ISV Success program."

---

## Things to drop

- "Live EPR validation" as a built capability.
- "Medication-specific risk scoring" as a built feature (rename: "the clinical rule pack").
- "Clinical scenarios" plural — you have time for one + the allergy rule.
- "Aligned with EU AI Act + GDPR" as a one-line headline.
- Any framing that the AI Act is "currently enforced" for medication AI.
- Annex III point 5(a) if cited for clinical medication AI (wrong article).
- "Behavioral risk scoring" phrasing (Article 5(1)(c) social-scoring trigger word).
- "Three-strike shutdown" phrasing for the clinical audience: rename "progressive escalation with graceful degradation" or "Article-14-aligned human-oversight ladder."
- Any framing that Sentra delivers "EU AI Act compliance" or "GDPR compliance" wholesale.
- Any implication of existing Charité endorsement, pilot, or relationship.
- "No runtime layer exists" market claim (false by May 2026, and the whole point of the pivot is to acknowledge Microsoft's toolkit).
- Any positioning that frames Sentra as a competing **platform** to the Microsoft Agent Governance Toolkit. Sentra is content + behavior; the toolkit is plumbing. Different products.
- "KHZG funding" framing as if money is still flowing (federal window closed end-2024).
- Any implication that hospitals are deploying autonomous prescribing agents today.
- Business model detail (SaaS + monitoring + compliance reporting) for a student showcase.

---

## Microsoft hooks (the missing layer)

- **Opener:** "Charité is already a Microsoft Dragon Copilot launch customer since March 2025. Dragon Copilot writes the note. The next agent Charité deploys will write the order. Sentra is the clinical content layer for that next agent."
- **Slide 2 acknowledgment:** Microsoft Agent Governance Toolkit (April 2, 2026) is the generic plumbing layer. Sentra is the clinical content layer that plugs into it. Two layers, one stack. Show this as a literal architecture diagram with two boxes: Microsoft = interception + policy engine; Sentra = clinical rule pack + Article-12 audit + medication-aware escalation.
- **Stack-fit sentence to memorise:** "Sentra is a clinical-domain content pack for agents built on the Microsoft Agent Framework, designed to plug into the Agent Governance Toolkit as the medication rule pack, consumes Azure AI Content Safety signals, writes audit events compatible with Purview AI Hub, runs in Azure Germany regions, and is designed to ship as a transactable offer in Azure Marketplace via the ISV Success program."
- **Three-strike → Microsoft language:** Tie to "emergency kill switch" in the Agent Governance Toolkit docs and Healthcare Agent Service's "chat / clinical / compliance safeguards" taxonomy. Position Sentra as the clinical+compliance safeguard layer.
- **Cite Agnes Heftberger by name** as the public champion of the Dragon Copilot German rollout.
- **Data plane:** Microsoft Fabric for Healthcare uses Azure AI Language Text Analytics for Health to extract medications + dosages from clinical text. State the integration direction.
- **Use Microsoft's Cloud Adoption Framework for AI vocabulary** (Govern / Manage / Secure AI).
- **Mention Microsoft Reactor Berlin** (AgentCon, "Build Scale & Govern AI Agents" livestreams) and the Berlin office at Unter den Linden 17.

---

## Facts to weave in (with sources)

| Fact | Where in pitch | Source |
|------|----------------|--------|
| Charité = Dragon Copilot launch customer since March 31, 2025; GA October 7, 2025; championed by Microsoft Germany CEO Agnes Heftberger | Slide 2 opener | news.microsoft.com/de-de/nach-erfolgreicher-pilotphase-microsoft-dragon-copilot |
| Microsoft Agent Governance Toolkit (April 2, 2026): sub-ms interception, YAML/Rego/Cedar, EU AI Act + HIPAA mapping | Slide 3 architecture-fit (where Sentra plugs in) | opensource.microsoft.com/blog/2026/04/02 |
| Charité Epic contract Dec 2025, ~200M EUR, end-2029 rollout; currently runs Oracle Cerner i.s.h.med | Architecture slide | Charité press release Dec 16 2025; HTN Health Tech News |
| EU AI Act enforcement: Feb 2 2025 (prohibitions), Aug 2 2025 (GPAI + AI Office), Aug 2 2026 (Annex III + Art 26 deployer), Aug 2 2027 (Art 6(1) MDR-embedded), Aug 2 2028 (Council March 2026 moved Annex I). Penalty ceiling 15M EUR or 3% global turnover | Regulatory slide | artificialintelligenceact.eu/implementation-timeline |
| Routine in-hospital medication AI is high-risk via Art 6(1) + Annex I via MDR Annex VIII Rule 11. Medicine dosage calculator is textbook Class IIa | Regulatory slide | MDCG 2025-6 / AIB 2025-1 |
| Article 12 requires AUTOMATIC logging (manual does not count); Art 26(5) requires deployer retention ≥6 months; Art 14(4)(d) intervention via stop button; 14(4)(e) override/reverse | Architecture annotations | artificialintelligenceact.eu/article/12, /14, /26 |
| ECRI ranked AI chatbot misuse #1 healthcare hazard 2025-2026; general LLMs fabricate medication info in ~1 of 7 medical documents; methotrexate 25mg daily (correct: 25mg WEEKLY) is canonical failure | Problem slide + demo scenario | ECRI 2025-2026 Top 10 Health Tech Hazards |
| Germany: ~4.5% inpatient ADE rate; ~1.058B EUR/year cost; EU-wide medication-error mortality 60k-131k/year | Problem slide cost-of-inaction | Stausberg/Hasford PMC; ScienceDirect microcosting; EAASM |
| Charité runs CLAIM lab (Z-Inspection), EMPAIA (11.4M EUR), TEF-Health, VALIDATE, HFrEF-Navigator (live medication-guideline AI). Newsweek #1 smart hospital 2026 | Charité-fit slide | claim.charite.de; charite.de press |
| Microsoft for Startups Founders Hub: up to $150K Azure credits / 4 years; ISV Success: 12-month free path to Azure Marketplace | Ask slide | microsoft.com/en-us/startups |
| Deloitte 2026: only 21% of orgs have mature governance for agentic AI; MS Data Security Index 2026: only 47% have GenAI security controls | Urgency stat | Deloitte 2026; MS Data Security Index 2026 |
| Düsseldorf University Hospital ransomware Sept 2020 patient diversion + death; 3 more large-hospital ransomware incidents in Germany in 2024 | One sentence on patient-safety framing | Healthcare IT News; heise online |
| Sentra first commit Feb 27, 2026; core engine + 3-strike by March 12, 2026 (predates Microsoft Agent Governance Toolkit by 5+ weeks) | Quiet credibility note, NOT a lead claim | ksolano220/sentra git log |

---

## 5-day sprint plan

### Day 1 — Mon: Scope lock + architecture freeze

Whole team in one room. Officially kill Phase 2/3 as built deliverables; reclass as roadmap. Lock the pivot framing (Sentra = clinical content layer, not competing governance platform). Write the demo script as a literal document: "agent makes 4 tool calls, third is methotrexate 25mg DAILY, Sentra intercepts pre-execution, blocks, writes audit row with policy version + inputs + SHA-256 + timestamp + user + agent ID, strike counter increments, dashboard updates, fourth call (different drug) passes."

Roles:
- A: rule engine wiring + audit row schema
- B: mock FHIR /MedicationRequest endpoint + agent SDK call seam
- C: Streamlit dashboard + strike counter UI
- D: deck + Microsoft-stack diagram (two-box layout: MS toolkit = plumbing, Sentra = clinical layer) + ask slide
- E: regulatory-citation slide + Q&A prep

EOD: demo script in repo, 10-slide deck outline in shared deck, repo branches assigned, every team member knows their day-2 task.

### Day 2 — Tue: Build the one rule end-to-end

Single rule: methotrexate frequency check (block if frequency='daily' AND drug='methotrexate'). Wire into existing rules engine. Build minimal FHIR-shaped mock EPR as one Python file with /MedicationRequest endpoint returning canned patient context (allergies, weight, eGFR, current meds). Wire agent SDK to call Sentra pre-execution. Confirm the block path returns a structured response containing rule_id, rule_version, policy_hash, decision='block', reason citation, and writes a tamper-evident audit row. CLI demo of full intercept loop must work by EOD. **Stop here if behind: this single loop is the whole pitch.**

### Day 3 — Wed: Dashboard + second rule for generality optics

Streamlit dashboard shows: live action stream, blocked/allowed/escalated counts, audit drill-down with the policy that fired, per-session strike counter, three-strike shutdown indicator. Add ONE second rule (allergy interaction against the canned allergy list) to prove the rule format is general, not bespoke. Begin drafting all 10 slides. EOD: dashboard demoable, deck has all slides drafted (rough).

### Day 4 — Thu: Microsoft-native framing + first dry run

Rewrite every slide in Microsoft vocabulary: Dragon Copilot, Microsoft Agent Framework, Azure AI Foundry, Azure AI Content Safety, Healthcare Agent Service, Microsoft Fabric for Healthcare, Purview AI Hub, Azure Health Data Services, ISV Success, Founders Hub. Slide 3 = the two-box architecture diagram (MS Agent Governance Toolkit = plumbing, Sentra = clinical content layer). Replace "aligned with EU AI Act + GDPR" with specific article cites (Art 12, Art 14(4)(d)-(e), Art 26(5)) and MDCG 2025-6 citation. Open the deck with the Charité–Dragon Copilot opener. Full team dry run end-to-end with one external observer (a professor or another student) timing the talk. Fix overclaims. EOD: deck locked, demo rehearsed once.

### Day 5 — Fri: Two dry runs + demo hardening + Q&A rehearsal

Two full dry runs on the actual laptop you will fly with, on the same WiFi conditions as the venue if possible. Record a backup video of the demo as fallback. Rehearse answers to the 8 predictable Microsoft questions:

1. How is this different from the April 2026 Agent Governance Toolkit?
2. Which EPR are you integrated with?
3. Are you a medical device?
4. What's your real relationship with Charité?
5. How do you handle false positives + alert fatigue?
6. Where does this live in the Azure stack?
7. What's the ask?
8. Why three strikes, not two or five?

Prepare a one-page leave-behind: condensed deck + GitHub link + the four-item ask. Pack. Sleep. Fly Saturday.

---

## Minimal credible demo (the actual thing to ship)

A generic deterministic policy engine (already built), with TWO wired medication rules:
1. Methotrexate frequency mismatch: block if frequency='daily' AND drug='methotrexate' (ECRI's canonical hallucination example).
2. Allergy interaction against a canned patient allergy list.

Called pre-execution by a Python agent SDK against a single-file mock FHIR /MedicationRequest endpoint, producing an Article-12-shaped tamper-evident automatic audit log (rule_id, rule_version, policy_hash, inputs, SHA-256, timestamp, user, agent_id, decision, reason citation), with a cumulative per-session risk counter and a three-strike shutdown, surfaced in a Streamlit dashboard that visualises one live intercept on stage.

**Demo narration (90 seconds):** agent proposes methotrexate 25mg daily, Sentra blocks pre-execution, audit row appears in dashboard with the citation, strike counter increments, agent retries with an allergy-conflicting drug, blocked again, third violation triggers session shutdown banner.

Every other capability on the deck is labelled "reference scenario for the pattern" on the roadmap slide.

---

## Most likely Microsoft objection + rehearsed answer

**Objection:** "Microsoft open-sourced the Agent Governance Toolkit on April 2, 2026 with sub-millisecond pre-execution interception, OPA Rego and Cedar policy languages, and explicit EU AI Act + HIPAA mapping. That is functionally your architecture. Why isn't Sentra redundant with what we already ship for free?"

**Answer:** "We started Sentra in February 2026 as an IBM SkillsBuild project. The core supervisor and three-strike engine were committed by mid-March, five weeks before the Agent Governance Toolkit was published. Two teams from completely different starting points converged on the same runtime-interception architecture: that's the strongest possible signal the pattern is right.

But we're not pitching a competing toolkit. The Agent Governance Toolkit is generic plumbing — interception, Rego policies, audit hooks. Sentra is the clinical content layer that plugs into that plumbing. Three specific things the toolkit doesn't ship and shouldn't ship:

One: a medication rule pack with named clinical primitives — dose-range, frequency-mismatch, drug-drug interaction, allergy conflict, formulary check — sourced from Fachinformationen and AkdÄ guidance, deterministic and reproducible under Article 14 effective oversight.

Two: cumulative per-encounter, per-agent risk accumulation with a three-strike progressive escalation — silent log, pharmacist co-sign, agent suspension — that maps to Article 14(4)(d) interrupt-via-stop-button as a clinical safety pattern, not a generic policy violation.

Three: an audit log schema shaped specifically to Article 12 automatic logging plus Article 26(5) six-month deployer retention, plus a FRIA evidence feed under Article 27 for public-sector deployers like German Universitätskliniken.

The plumbing is yours. The clinic is ours. We'd love to explore Sentra as a partner offering that plugs into the toolkit for the medication vertical."

---

## Competitive one-liner

"Microsoft's Agent Governance Toolkit gives you the interceptor; Epic governs models inside Epic; IBM watsonx monitors agent behavior horizontally with LLM-as-judge; Azure AI Content Safety filters prompts and outputs. Sentra is the clinical content layer that runs on top — a medication rule pack, an Article-12-shaped audit log, and a medication-aware progressive escalation ladder that none of them ship and none of them should."
