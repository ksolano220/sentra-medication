# Pitch Deck Content: Sentra Medication

NYU SPS Group 3 · Microsoft Berlin GFI 2026 · presented Tuesday June 2, 2026

This file is the deck content in markdown form. Team imports into Google Slides / PowerPoint Monday morning. Each slide section includes the body, speaker notes, and visual instructions.

Read [berlin-sprint-plan.md](./berlin-sprint-plan.md) and [microsoft-toolkit-comparison.md](./microsoft-toolkit-comparison.md) for the framing this deck is built on.

**Total runtime target:** 8 minutes pitch + 7 minutes Q&A.

---

## Slide 1 · Cover

**Sentra · Medication Governance**

Runtime clinical content layer for AI agents.

NYU SPS Berlin GFI 2026 · Group 3
Presented to Microsoft · June 2026

**Visual:** Clean white background, green accent strip across the top (matches the rebranded dashboard). Group 3 logo or member names small at the bottom. Use the same green (#16a34a) as the dashboard for visual consistency. No stock photography.

**Speaker notes:** Keep this slide on screen for ~5 seconds. Introduce: "We're Group 3 from NYU SPS. We built Sentra, a runtime governance layer for clinical AI agents. We have a working MVP. Today we'll show you the demo and propose how Sentra plugs into the Microsoft stack."

---

## Slide 2 · Charité + Dragon Copilot (the opener)

**Charité is already a Microsoft Dragon Copilot launch customer.**

Pilot started March 31, 2025. GA across Germany October 7, 2025. Championed by Microsoft Germany CEO Agnes Heftberger.

> Dragon Copilot writes the note. The next agent writes the order.
> Sentra is the runtime governance layer for that next agent.

**Visual:** Two-arrow flow: `Dragon Copilot (notes) → [your next agent] (orders) → Sentra (gates the order)`. Use Microsoft product names verbatim. Pull a photo or quote from Microsoft Germany's October 2025 press release if you can.

**Speaker notes:** This is your hook. Open with Charité + Dragon Copilot in the FIRST sentence. Microsoft Berlin healthcare team helped ship this; the room will recognize it instantly. The implied message: "we did the homework, we know your customer, we know your product." Don't speed-read this slide. Pause for 2 seconds after the quote.

---

## Slide 3 · The problem

**ECRI's #1 healthcare hazard of 2025-2026: AI chatbot misuse in clinical workflows.**

- General-purpose LLMs fabricate medication information in ~1 of every 7 medical documents.
- ECRI's canonical example: methotrexate 25mg DAILY (correct schedule: weekly). Daily dosing causes severe bone marrow suppression, hepatic toxicity, mucositis, death.
- Germany hospitals already absorb ~4.5% inpatient ADE rates, costing ~€1.058B/year.
- Deloitte 2026: only 21% of organizations have mature governance for agentic AI.

**Visual:** Big number callouts: "1 in 7", "4.5%", "€1.058B", "21%". Use the dashboard's amber #b45309 for the urgency tone, not red (avoid alarm fatigue). Cite ECRI + Stausberg/Hasford + Deloitte in small text at the bottom.

**Speaker notes:** Land each number with a beat. The methotrexate example is concrete and visceral, you'll come back to it in the live demo on Slide 6. Don't editorialize, the numbers do the work. End with: "These agents are coming. The governance layer isn't keeping up."

---

## Slide 4 · What Microsoft already shipped

**Microsoft Agent Governance Toolkit · April 2, 2026 · open source.**

- Sub-millisecond pre-execution action interception (<0.1ms p99)
- YAML + OPA Rego + Cedar policy languages
- 13+ host framework adapters (LangChain, CrewAI, AutoGen, Semantic Kernel, Microsoft Agent Framework, Google ADK, OpenAI Agents SDK, etc.)
- Merkle hash-chain audit + OpenTelemetry spans
- Explicit EU AI Act + HIPAA + OWASP Agentic Top 10 mapping

**The runtime-interception thesis is now consensus.**

**Visual:** Screenshot or logo of the Microsoft Agent Governance Toolkit GitHub repo. Show one line of YAML policy from their tutorial. List the 13+ frameworks in a small grid.

**Speaker notes:** This is the credibility move. Microsoft will think "they know our toolkit exists, they're going to position around it, not pretend to compete." Acknowledge specifically: "We started Sentra in February 2026. The supervisor and three-strike engine were committed by mid-March, five weeks before April 2. We converged on the same runtime-interception architecture independently. The pattern is right." Don't dwell on the date claim, drop it once and move on.

---

## Slide 5 · Sentra is the clinical content layer

**Microsoft solved interception. Sentra solved the clinic.**

| | Microsoft Agent Governance Toolkit | Sentra |
|---|---|---|
| Layer | Generic plumbing | Clinical content + behavior |
| Policy expression | YAML, OPA Rego, Cedar | Clinical rule pack |
| Audit log | Hash-chained policy events | Article-12 audit with statutory citation per event |
| Escalation | Allow / block | Progressive ladder: silent log → pharmacist co-sign → agent suspension |
| Domain knowledge | None (by design) | Fachinformationen, AkdÄ, ECRI canonical failures |
| Who builds it | Microsoft | Hospital deployers + clinical partners |

**Visual:** Two boxes side-by-side. Left box (Microsoft) in their blue. Right box (Sentra) in your green #16a34a. Arrows showing Sentra plugging into the Microsoft pipeline. This is the single most important slide visually; spend time on it.

**Speaker notes:** Slow down here. This is where the pitch lands or doesn't. Walk down the table row by row. The "Domain knowledge: None (by design)" line is the wedge: Microsoft will NOT ship medication knowledge, that's not their business. Land the closing line, "Microsoft solved interception, Sentra solved the clinic," with confidence. Pause. Then go to demo.

---

## Slide 6 · Live demo (methotrexate scenario)

**Methotrexate 25mg DAILY · ECRI canonical hallucination · blocked pre-execution.**

90-second narration:
1. Agent proposes `PRESCRIBE_MEDICATION drug=methotrexate dose=25mg frequency=daily patient=P-2026-001`
2. Sentra intercepts pre-execution. Rule `BLOCK_METHOTREXATE_FREQUENCY_MISMATCH` fires.
3. Article-12 audit row appears in the dashboard with `policy_hash`, `inputs_sha256`, and statutory citation.
4. Strike counter increments.
5. Agent retries with a different patient (penicillin allergy + amoxicillin). Allergy rule fires, blocked again.
6. Third blocked attempt triggers `AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS`. Agent status flips to "Agent Shut Down".
7. Fourth attempt (safe amoxicillin prescription for a different patient) is still denied: the agent is no longer trusted in this session.

**Visual:** Run the dashboard live on the laptop. Use a backup recording from Monday night as fallback. Pre-stage the screen so the audit log starts empty.

**Speaker notes:** Whoever drives the laptop should rehearse this Monday at least twice on the actual presentation hardware. Narrate one line per step. The audit-row appearance is the hero moment; pause for 2 seconds when it renders so the audience can read the citation. The three-strike shutdown is the punchline.

---

## Slide 7 · Regulatory framing

**Sentra operationalises specific EU AI Act articles. It does not deliver wholesale "AI Act compliance."**

- **Article 12** (automatic logging — manual logs do not satisfy) → Sentra is an Article-12-grade automatic decision log by construction.
- **Article 14(4)(d)** (interrupt via stop button) → Sentra's pre-execution block.
- **Article 14(4)(e)** (override / reverse) → Sentra's allow / escalate routes.
- **Article 26(5)** (deployer log retention ≥6 months) → Sentra's audit shape.
- **Article 6(1) + Annex I via MDR Annex VIII Rule 11** is the high-risk pathway for medication AI (medicine dosage calculator = Class IIa). NOT Annex III point 5(a).

**Sentra is NOT a medical device.** It does not diagnose, prescribe, or recommend. It enforces hospital-authored policy on agents that do. Outside MDR scope.

**Enforcement timeline:** Aug 2 2026 (Annex III + Article 26 deployer duties) · Aug 2 2027 (Article 6(1) MDR-embedded) · Aug 2 2028 (Council March 2026 moved Annex I). **Penalty ceiling: €15M or 3% global turnover.**

**Citation:** MDCG 2025-6 / AIB 2025-1 (June 2025), Interplay between the MDR & IVDR and the AI Act.

**Visual:** Two columns. Left: the four Article numbers with one-line each. Right: the enforcement timeline as a horizontal date axis with three dots (Aug 2026 / 2027 / 2028). Penalty number bottom-right in dashboard amber.

**Speaker notes:** Read the Articles aloud. Get the dates right. The "Sentra is NOT a medical device" line is the regulatory defense that prevents Microsoft (or any regulator-literate listener) from putting Sentra inside MDR conformity scope. Drop the MDCG 2025-6 citation, it signals you've read the actual interplay guidance.

---

## Slide 8 · Where Microsoft is honestly better

**The credibility move. Say these out loud.**

- **Latency:** in-process middleware (<0.1ms p99) > Sentra's HTTP roundtrip.
- **Policy DSL:** YAML + Rego + Cedar > a Python switch statement.
- **Ecosystem reach:** 13+ host framework adapters > Sentra's one Python decorator.
- **Audit cryptography:** Merkle hash-chain + OpenTelemetry > plain JSON append.
- **Deployment maturity:** Helm charts, sidecar pattern, App Service guide > `uvicorn` + JSON file.
- **Compliance breadth:** OWASP Agentic Top 10 + HIPAA + AI Act packages > none yet.
- **Governance longevity:** Microsoft-backed with foundation path > single-maintainer student project.

> We're not competing on plumbing. The plumbing is theirs.

**Visual:** Plain list, no chart. Use the dashboard's green pill style for "Microsoft" and the amber pill style for "Sentra (today)". Looks honest, signals you did the comparison.

**Speaker notes:** This slide is the trust-builder. Microsoft engineers will mentally tick each item; the fact that you named them first removes their objection before they raise it. The closing line: "We're not competing on plumbing. The plumbing is theirs." Pause one beat, then flip to Slide 9.

---

## Slide 9 · Where Sentra is genuinely differentiated

**Anchored in code, not marketing.**

1. **Cumulative per-agent risk + three-strike progressive escalation as a stateful behavioral primitive.** Microsoft's kernel is explicitly "stateless by design." Sentra's `supervisor/risk.py:apply_risk()` carries state across calls. Different mental model: not "is this call allowed" but "is this agent still trustworthy in this session."

2. **Clinical rule pack as the deliverable.** Methotrexate frequency, allergy-family expansion. Sourced from ECRI + Fachinformationen + AkdÄ. Microsoft explicitly does not ship clinical content.

3. **Article-12-shaped audit row with statutory citation per event.** Every decision row carries `rule_id`, `rule_version`, `policy_hash`, `inputs_sha256`, and a statutory citation. Regulator-letter-shaped, not policy-decision-shaped.

4. **Roadmap teaser: Agent State Continuity.** Quality-scored checkpoint/restore on drift. Snapshot agent context at the last good point, terminate the degrading instance, restore onto a fresh agent so handoff continuity is preserved without bad-state contamination. Stateful by design.

**Visual:** Snippet of `supervisor/risk.py` showing `cumulative_risk`, `BLOCK_THRESHOLD=3`, status transition to `Agent Shut Down`. Sample audit-row JSON with the new fields. Side-by-side: "Microsoft (stateless)" vs "Sentra (stateful)".

**Speaker notes:** This is the differentiator slide. The stateful-vs-stateless contrast is real and defensible; lean into it. Showing actual code earns trust. The Agent State Continuity teaser plants a forward-looking idea Microsoft can grow with you on, NOT as today's claim.

---

## Slide 10 · The ask

**Four items right-sized for a Microsoft Berlin strategist to say yes to in week one.**

1. **Explore Sentra as a partner offering** that plugs into the Microsoft Agent Governance Toolkit for the medication vertical.
2. **Microsoft for Startups Founders Hub credits** (up to $150K Azure over 4 years).
3. **Intro to the Charité Dragon Copilot pilot owner** + 30-min fit review with the Microsoft Berlin healthcare team (Unter den Linden 17).
4. **Azure Marketplace + ISV Success fit review** for a Sentra transactable offer.

**One-page leave-behind:** condensed deck + GitHub link + the four-item ask. Hand to the room as you sit down.

**Visual:** Numbered list, generous spacing. QR code or short URL to the GitHub repo at the bottom. Your contact info beside it.

**Speaker notes:** A Microsoft Berlin strategist can route ALL FOUR of these in a single week. That's the design. Don't ask for co-sell, enterprise deal, or PoC funding, wrong size for an academic showcase. Close with: "We have a working MVP. We'd love to talk about how it lives inside your stack." Sit down.

---

## Appendix · Speaker assignments (fill in Monday)

| Slide | Speaker | Backup |
|---|---|---|
| 1 Cover + 2 Opener | | |
| 3 Problem | | |
| 4 MS toolkit + 5 Layer | | |
| 6 Live demo | Katherine | |
| 7 Regulatory | | |
| 8 MS better + 9 Sentra differentiated | | |
| 10 Ask | | |

---

## Appendix · Demo failure plan

If the live demo breaks on stage:
1. Switch to backup recording (recorded Monday night, in `~/sentra-medication/demo/backup.mov`).
2. Narrate from the recording.
3. Continue to Slide 7 without acknowledging the failure as a problem. "Here's the same scenario from our recording."

If the deployed Azure URL is down and you have not configured local-only fallback:
1. Run `./demo/start.sh` from the laptop terminal (TODO: write this script Monday if Azure deploy lands).
2. Otherwise run `.venv/bin/uvicorn supervisor.main:app` + `.venv/bin/streamlit run dashboard/app.py` in two terminals before the talk starts.

Test the failover sequence Monday during dry runs.
