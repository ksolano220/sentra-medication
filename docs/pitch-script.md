# Sentra — Pitch Script + Q&A Prep

**NYU SPS Berlin GFI 2026 · Group 3 (Fizza, Kat, Jovan, Karla).** Presented to Google and Join Capital; the final pitch was with the professor. **Won the pitch competition.**

This is the spoken pitch and the panel Q&A prep. The full written business case is in [business-case.md](business-case.md).

---

## The pitch (spoken)

### Fizza — Problem (40–45 sec)

Medication errors affect 1 in every 30 hospital patients across Europe right now, and hospitals are increasingly handing prescription decisions to AI systems that have no real-time governance layer watching over them.

Berlin hospitals are investing heavily in digital transformation and AI-enabled healthcare. Charité Hospital in Berlin (one of the largest hospitals in Europe) recently selected Epic EPR (an electronic patient record) as the foundation for its next-generation clinical infrastructure. During large-scale system transitions, when data pipelines are being rebuilt, APIs are being reconnected, and patient records are being migrated, the risk of wrong-patient prescriptions, allergy conflicts, dosage anomalies, and drug interaction failures becomes significantly elevated.

The European Union now classifies many healthcare AI systems as high-risk because failures can directly impact patient safety. Current governance is largely reactive: static policies, manual reviews, post-incident analysis. There is no infrastructure monitoring what happens during live AI execution, no layer that intercepts an action before it reaches the pharmacy.

The challenge is that traditional cybersecurity protects users, devices, and networks, but it does not monitor AI decisions in real time. As AI systems gain greater influence over clinical and operational workflows, healthcare organizations need a way to detect risky AI behavior before it reaches production systems.

### Kat — Solution, Architecture & Go-To-Market (60–65 sec)

That's where Sentra comes in.

Sentra is a runtime governance and intervention layer, an independent middleware that sits between an AI system and execution, monitoring and validating actions in real time, before they happen.

When an AI prescription system generates a medication order, Sentra intercepts it, validates it against live patient data fetched directly from the EPR via FHIR, and makes a decision: allow, block, or escalate to a human clinician, instantly, in under 100 milliseconds.

And critically, Sentra is independent by design. It doesn't sit inside the AI tool, because an AI system governing its own outputs is like asking someone to mark their own exam. Sentra sits between the AI and execution precisely because independence is what makes governance meaningful. This separation also creates clean legal accountability.

Now, who does Sentra sell to, and how do we get there? We don't sell to hospitals first. Our go-to-market enters through the platforms hospitals already depend on.

- **Phase one: EHR marketplaces.** Epic's Showroom already lists hundreds of certified third-party integrations. We complete Epic's vendor certification process, which requires FHIR R4 compliance, OAuth 2.0 security validation, and sandbox testing, and ship Sentra as a certified governance module inside that ecosystem. Governance ships with the product, not as a separate hospital procurement.
- **Phase two: AI clinical software vendors** who are building the medication tools hospitals are deploying right now, and who need EU AI Act compliance built in before August 2026.
- **Phase three: Direct enterprise contracts** with hospital networks.

Our test market is Berlin, specifically the Epic EPR rollout at Charité. It is the highest-risk transition environment in Germany right now, it is the most credible proof-of-concept address in European healthcare, and the regulatory deadline is nine weeks away.

### Jovan — Technical Validation & AI Risk Mitigation (40–45 sec)

Let me explain how Sentra handles the two risks people worry about most: AI hallucinations and human error.

For AI hallucinations, Sentra doesn't trust the AI's internal logic. Every medication action is validated against live patient data fetched in real time via FHIR R4. Allergy conflicts and clinical dosing rules are checked today. Patient identity, drug-drug interaction checks, and EPR consistency are on the immediate roadmap. Hard clinical rules form a floor that no hallucination can bypass, because Sentra's validation engine operates entirely independently of the AI model generating the order.

For human risk, specifically automation bias and alert fatigue, Sentra uses risk-scored escalation. Not every anomaly creates an alert. Only high-confidence, high-severity flags reach a clinician. And when they do, the system cannot proceed without explicit human sign-off. Every override is logged, timestamped, and auditable, which creates a culture of accountable decision-making rather than unchecked bypass.

Architecturally, Sentra is a lightweight middleware layer integrating via standard FHIR R4 APIs, compatible with Epic, Oracle Health, and CompuGroup Medical out of the box. Validation decisions are returned in under 100 milliseconds, below the threshold of clinical workflow disruption.

### Karla — Compliance, Liability & Closing (45–50 sec)

EHR vendors and AI clinical software companies operating in Europe face an urgent, non-negotiable challenge. The EU AI Act classifies healthcare AI as high-risk, with mandatory human oversight and accountability obligations taking effect August 2, 2026, nine weeks away. Non-compliance penalties reach up to €15 million or 3% of global turnover.

But beyond the fine, there is the question of legal liability. Under the EU AI Act and the revised EU Product Liability Directive, liability for a medication error involving AI is distributed across the chain: the AI vendor is primarily liable for model defects; the EHR platform for data integrity; the middleware provider, Sentra, for the governance layer's performance; the hospital for deployment and training; and the clinician for negligent override.

Sentra actually reduces liability exposure for EHR vendors and AI companies. Our audit logs, every action, every block, every escalation, are not just operational records. They are legal evidence of human oversight compliance. They are what a vendor presents to a regulator to demonstrate they met their obligations under the AI Act.

When we say Sentra ships as a certified module, we mean two things precisely: EU AI Act conformity assessment conducted by an accredited EU Notified Body, organisations like TÜV SÜD, already established in medical device certification under the MDR, and Epic marketplace certification through Epic's own vendor validation process. These are not standards we invented. They are well-defined pathways we are building toward.

Sentra is not just a patient safety tool. It is compliance infrastructure for the AI-powered healthcare platform ecosystem, and for any vendor who needs to answer the question: "How do you know your AI didn't hurt anyone?" Sentra is the answer.

The regulatory clock is already running. Thank you.

---

## Q&A prep

### 1. What does "certified" mean? Who gives the certification?

Two distinct layers:

**Layer 1 — EU AI Act Conformity Assessment.** Under the EU AI Act (effective August 2, 2026), healthcare AI is high-risk and must undergo a formal conformity assessment before deployment, conducted by EU Notified Bodies (independent organisations designated by member states, like medical devices under the MDR). Examples: TÜV SÜD, TÜV Rheinland, BSI Group, SGS. Member states are still finalising AI Act Notified Bodies (as of June 2026), but the framework mirrors existing MDR/IVDR processes. Sentra, as a governance layer for high-risk healthcare AI, would itself need to demonstrate human oversight, transparency, traceability, and risk management to pass.

**Layer 2 — Epic Marketplace Certification.** To ship as a certified module in Epic's Showroom, Sentra passes Epic's vendor certification: FHIR R4 + SMART on FHIR integration compliance, OAuth 2.0 security validation, sandbox testing in Epic's environment, HIPAA compliance review, workflow compatibility checks. Timeline: typically 3–12 months depending on integration complexity.

**Panel answer:** "Certified refers to two things: EU AI Act conformity assessment conducted by an accredited EU Notified Body such as TÜV SÜD, and Epic Marketplace certification through Epic's own vendor validation process. Both are well-defined pathways. We are not inventing a certification standard; we are plugging into existing ones."

### 2. Why does the middle layer need to be separate instead of part of the top layer?

1. **Legal & liability separation.** Embedded governance entangles liability (was it the AI tool's fault or the governance layer's?). A separate middleware layer has its own clearly defined legal accountability, cleanly divided between the AI vendor, Sentra, and the hospital. Under the EU AI Act and Product Liability Directive, a distinct layer makes audit trails, incident investigations, and regulatory evidence far cleaner.
2. **Vendor independence & interoperability.** Embedding governance into one AI tool means it only governs that tool. A separate layer sits between any AI prescription system and any EHR (Epic, Oracle Health, CompuGroup Medical), making it platform-agnostic and scalable.
3. **The top layer shouldn't grade its own homework.** An AI governing its own outputs is a conflict of interest; a hallucinating model may not recognise its own error. A separate, independent layer validates against live EPR data with no dependency on the AI model's internal logic.
4. **Modularity & regulatory updatability.** Regulations evolve. A separate middleware layer can be updated, audited, and replaced independently without touching the core AI tool or EHR.

**Panel answer:** "The middle layer exists precisely because the AI system should not be responsible for governing itself. Independence is the point. It creates clean liability separation, allows one governance layer to serve multiple AI tools, and ensures that when regulations change, governance infrastructure can be updated without disrupting the clinical AI tools or the EHR."

### 3. Go-to-market strategy

- **Phase 1 — Beachhead: EHR marketplace entry (0–12 months).** Target Epic Showroom / Oracle Health marketplace. Complete Epic vendor certification, list Sentra as a governance module. Hospitals already procure from these marketplaces, so Sentra ships with products they already buy, removing the separate hospital sales cycle.
- **Phase 2 — AI clinical software vendors (6–18 months).** Target AI medication management companies (e.g., Medication.io, Infermedica, Navina) who need EU AI Act compliance built in. API-based B2B SaaS; sell compliance as a service to vendors who can't build it before the August 2026 deadline.
- **Phase 3 — Direct enterprise (18+ months).** Large hospital networks and university medical centres (e.g., Charité, Vivantes in Berlin). Enterprise SaaS with compliance reporting and audit dashboards.

**Revenue model:** SaaS subscription (per EHR vendor / AI platform); marketplace module (revenue share or flat licence via Epic/Oracle); API integration fee (per-call or tiered); compliance reporting (add-on audit log + regulatory reporting service).

### 4. Test market

**Berlin — the Epic EPR rollout at Charité.** Charité is actively deploying Epic EPR (live infrastructure transition = highest risk window = highest governance need); EU AI Act deadline August 2026 (Berlin-based vendors need compliance now); strong Berlin health-tech ecosystem (BIH Digital Labs, Intel partnership); EU regulatory proximity; a Charité pilot is a globally recognised validation signal.

**Secondary: UK NHS trusts** — 34,000+ medication errors/year, active digital investment, post-Brexit flexibility on AI regulation timelines.

### 5. Liability — who does it fall on?

Under the EU AI Act + EU Product Liability Directive (effective 2026), liability is distributed across the chain:

| Party | Legal responsibility |
|---|---|
| AI tool vendor | Primary liability for defects in the AI model's outputs (wrong dosing, hallucinated data) |
| EHR vendor (e.g., Epic) | Platform integrity, data accuracy within the EHR, certified integration standards |
| Sentra (middleware) | The governance layer's performance (failing to catch a risk it should have caught, or incorrectly blocking a valid action) |
| Hospital | Deployment decisions, staff training, ensuring AI is used within protocols |
| Clinician | Negligent misuse (e.g., overriding an escalation without clinical justification) |

Key points: Sentra **reduces** liability for EHR vendors and AI companies by providing documented, auditable governance; its audit logs become legal evidence; Sentra itself must carry professional liability / cyber insurance and complete its own conformity assessment before commercial deployment; shared liability is the reality (courts examine the full chain).

**Panel answer:** "Liability under the EU AI Act is distributed across the chain. AI vendor, middleware provider, hospital, and clinician each carry defined responsibilities. Sentra actually reduces liability exposure for EHR vendors and AI companies by providing documented, auditable proof of human oversight compliance. Our audit logs are not just operational tools, they are legal evidence. And yes, Sentra itself carries governance responsibility for its layer, which is why conformity assessment and professional liability coverage are part of our commercialisation plan."
