# Q&A Rehearsal: 8 Predictable Microsoft Questions

Memorize the beats, not the verbatim wording. Each answer is built to land in 30-45 seconds, end on a redirect to Sentra's actual differentiator.

Use these in two dry runs Monday. Whoever takes the question delivers the answer; the rest of the team stays quiet unless the speaker hits a specific gap and explicitly hands off ("Katherine, you want to add the technical detail there?").

---

## Q1 · "Microsoft open-sourced the Agent Governance Toolkit in April with sub-millisecond interception. Why isn't Sentra redundant?"

**Answer:**
"We started Sentra in February 2026, five weeks before the toolkit was published. Two teams from completely different starting points converged on the same runtime-interception architecture. That's the validation, not the threat. We're not pitching a competing toolkit. The Agent Governance Toolkit is generic plumbing. Sentra is the clinical content layer on top: a medication rule pack, an Article-12-shaped audit row with statutory citation per event, and a stateful three-strike escalation that your kernel is stateless-by-design and explicitly does not ship. The plumbing is yours. The clinic is ours."

**Land beats:** independent convergence · clinical content layer (not toolkit) · stateful vs stateless · "plumbing yours, clinic ours."

---

## Q2 · "Which EPR are you integrated with?"

**Answer:**
"None in production today. We demo against a mock FHIR `/MedicationRequest` endpoint that simulates the EPR-side context an agent fetches before proposing a medication action. Production integration target is Azure Health Data Services via FHIR R4 — Microsoft's own FHIR offering. Charité's situation: they signed Epic in December 2025 for ~€200M with end-2029 rollout target. They currently run Oracle Cerner i.s.h.med. Any 'live EPR integration' claim against Charité in May 2026 would be fiction. We're EHR-agnostic by design, which fits Charité's multi-EPR reality through 2029."

**Land beats:** mock FHIR for demo · Azure Health Data Services as production target · Charité timeline truth · EHR-agnostic.

---

## Q3 · "Are you a medical device?"

**Answer:**
"No. Sentra does not diagnose, prescribe, or recommend. It enforces hospital-authored policy on actions of agents that do, and produces audit records. That keeps Sentra outside MDR conformity scope. The agents Sentra gates are in MDR scope, typically Class IIa under Annex VIII Rule 11 because a medicine dosage calculator is the textbook example. Contrast Bayesian Health's May 2026 FDA 510(k) for sepsis monitoring: they make a clinical claim, they need clearance. We make a governance claim. Different regulatory surface."

**Land beats:** not a device · enforces hospital-authored policy · outside MDR scope · Bayesian contrast.

---

## Q4 · "What's your real relationship with Charité?"

**Answer:**
"None yet. We're proposing Charité as the showcase customer because the fit is obvious: they're Europe's #1 ranked smart hospital, they're already a Microsoft Dragon Copilot launch customer, and they run the CLAIM lab with the Z-Inspection trustworthiness methodology that Sentra plugs into naturally. The right vehicle for an academic project is a research collaboration with CLAIM or a TEF-Health testing-facility slot on synthetic data — not a clinical pilot. Production deployment would be tied to the 2027-2029 Epic build-out window."

**Land beats:** no current relationship · CLAIM + Z-Inspection + TEF-Health as the vehicle · research collaboration, not clinical pilot · production tied to Epic timeline.

---

## Q5 · "How do you handle false positives and alert fatigue?"

**Answer:**
"False-positive load on the pharmacy is the actual deployment risk, not a hypothetical. Three controls. First: ship in 4-6 week silent shadow-mode by default, where Sentra logs decisions but doesn't enforce. We measure per-rule sensitivity and specificity before flipping any rule to enforce. Second: pharmacist override + structured feedback loop, so every override updates the rule's confidence profile. Third: the three-strike threshold is per session, not global, so a noisy rule can't shut down an agent across encounters. The rule pack is meant to be curated by the hospital, not shipped as a fixed library."

**Land beats:** shadow-mode by default · per-rule sensitivity/specificity targets · pharmacist override feedback loop · per-session three-strike scope.

---

## Q6 · "Where does Sentra live in the Azure stack?"

**Answer:**
"Today: standalone Python service. Production architecture, the slide-3 box diagram: Sentra runs as a sidecar to agents built on the Microsoft Agent Framework, plugs into the Agent Governance Toolkit as a clinical policy pack, consumes Azure AI Content Safety groundedness signals, writes audit events compatible with Microsoft Purview AI Hub, runs in Azure Germany regions for GDPR data residency, and ships as a transactable offer in Azure Marketplace via the ISV Success program. The integration shim is two days of work, the architecture diagram is the production target we'd build with you."

**Land beats:** sidecar to Agent Framework agents · policy pack into Agent Governance Toolkit · Content Safety + Purview AI Hub · Azure Germany region · Marketplace via ISV Success.

---

## Q7 · "What's the ask?"

**Answer:**
"Four things right-sized for the Berlin office to route in week one. One: explore Sentra as a partner offering plugging into the Agent Governance Toolkit for the medication vertical. Two: Microsoft for Startups Founders Hub credits, up to $150K Azure over four years. Three: intro to the Charité Dragon Copilot pilot owner and a 30-minute fit review with the Microsoft Berlin healthcare team at Unter den Linden 17. Four: Azure Marketplace + ISV Success fit review for a Sentra transactable offer. We're not asking for co-sell, enterprise deal, or PoC funding. Wrong size for an academic showcase."

**Land beats:** four items · all routable in week one · explicitly NOT asking for co-sell or enterprise deal · we know the right surface for each ask.

---

## Q8 · "Why three strikes, not two or five?"

**Answer:**
"Three is empirical default, not a load-bearing claim. Two is too sensitive in noisy clinical settings; an agent that hits one false-positive shouldn't lose the encounter. Five lets too much drift compound before intervention. Three matches the credit-card industry's lockout threshold, which has decades of false-positive vs damage-prevention tuning behind it. The threshold should be configurable per agent role and per encounter type in production. For the demo it's hard-coded; the configuration surface is a one-day refactor we'd do for any actual pilot."

**Land beats:** empirical default not a claim · two too sensitive, five too permissive · credit-card precedent · production configurable, demo hard-coded.

---

## Bonus · 3 questions you may also get

### B1 · "What about LLM hallucination at the rule-authoring layer? If a clinician asks an LLM to write a Sentra rule, you're back to square one."

**Answer:** "Rules are deterministic Python or YAML reviewed by a pharmacist before they enter the rule pack. We don't synthesize rules from LLMs. The rule pack itself is curated, version-controlled, and auditable. The LLM lives in the agent we're governing, not in the governance layer."

### B2 · "Why open-source / what's the business model?"

**Answer:** "Sentra is MIT today because the value is in the curated clinical rule pack and the hospital deployment toolchain, not the engine. Long-term we'd commercialize the rule pack itself (subscription, like UpToDate or First Databank) and offer paid implementation services for hospitals. For this academic showcase we're focused on the architecture story; commercial model is a follow-up conversation."

### B3 · "Have you talked to BfArM or any German regulator?"

**Answer:** "Not yet. BfArM is the right regulatory address for production deployment, and we know that. For this stage of the project, the regulatory posture is: Sentra is non-device deployer-side infrastructure under MDCG 2025-6 / AIB 2025-1, hospitals still own Article 9 risk management, Article 27 FRIA, and GDPR Article 9(2)(h) basis. Sentra provides the auditable substrate those documents reference."

---

## Delivery notes

- **Don't filibuster.** If you don't know, say "we haven't built that yet; here's the design." Don't invent.
- **Don't oversell.** Microsoft engineers test claims in real time mentally. Every overstated detail costs trust.
- **Bridge to differentiator.** Every answer ends near one of: stateful three-strike, Article-12 audit, clinical rule pack, the four-item ask.
- **Pace.** 30-45 seconds per answer. If you go past 60 seconds the energy in the room drops.
- **Hand off cleanly.** "Katherine, you want to add the technical detail there?" beats interrupting.
