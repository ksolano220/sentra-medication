# Sentra: Runtime Governance Infrastructure for AI-Assisted Medication Management Systems

**Team:** Fizza, Kat, Jovan, Karla
**NYU SPS Berlin GFI 2026 · Group 3**

---

## Executive Summary

Medication errors affect roughly 1 in every 30 hospital patients across Europe, and hospitals are increasingly handing prescription decisions to AI systems with no real-time governance layer watching over them. Berlin is where this risk is most acute right now: Charité, one of Europe's largest university hospitals, has selected Epic EPR as the foundation of its next-generation clinical infrastructure. During large-scale system transitions, when data pipelines are rebuilt, APIs reconnected, and patient records migrated, the risk of wrong-patient prescriptions, allergy conflicts, dosage anomalies, and drug interaction failures is significantly elevated.

Sentra is a runtime governance and intervention layer: independent middleware that sits between an AI prescription system and execution. When an AI system generates a medication order, Sentra intercepts it, validates it against live patient data fetched directly from the Electronic Patient Record (EPR) via FHIR R4, and makes a decision: allow, block, or escalate to a human clinician. The whole check runs in under 100 milliseconds, before the order ever reaches the pharmacy. Sentra is independent by design: an AI system governing its own outputs is grading its own homework, and independence is what makes governance meaningful. It also creates clean legal accountability across the chain.

The timing is not optional. The EU AI Act classifies healthcare AI as high-risk, with mandatory human oversight and accountability obligations taking effect August 2, 2026, and penalties reaching €15 million or 3% of global turnover. Sentra is compliance infrastructure for that deadline. A working MVP has already been built and open-sourced, demonstrating real-time interception, policy evaluation, behavioral risk scoring, runtime intervention, and audit logging. The go-to-market enters through the platforms hospitals already depend on: EHR marketplaces first, then AI clinical software vendors, then direct enterprise contracts. Berlin and the Epic rollout at Charité serve as the test market.

## Problem Statement

Berlin's healthcare systems are undergoing rapid digital transformation while facing staffing shortages, rising patient volumes, and large-scale infrastructure modernization. Charité has selected Epic EPR as the foundation for its next-generation clinical infrastructure, and AI-assisted medication management systems are being integrated into hospital workflows at the same time. Transition periods are exactly when systems, APIs, patient records, and workflows fall out of sync. The consequences are clinical, not just operational: incorrect dosage recommendations, allergy conflicts, drug-drug interaction failures, stale or incomplete patient records, duplicate medication orders, and wrong-patient prescription execution.

Current governance is largely reactive. It depends on static policies, manual verification, post-incident reviews, and fragmented oversight. There is no infrastructure monitoring what happens during live AI execution, and no layer that intercepts an action before it reaches the pharmacy. This is the gap traditional cybersecurity does not cover: it protects users, devices, and networks, but it does not monitor AI decisions in real time.

Regulation is closing the gap from the other side. The EU AI Act classifies many healthcare AI systems as high-risk because failures directly impact patient safety, and it imposes mandatory human oversight, transparency, accountability, and risk management obligations effective August 2, 2026. Healthcare organizations and the vendors that supply them need a way to detect risky AI behavior before it reaches production systems, and a way to prove that oversight actually happened.

## Proposed Solution

Sentra is a runtime governance and intervention layer: independent middleware that sits between an AI prescription system and execution, monitoring and validating actions in real time, before they happen. Five core functions make this work.

**Real-time action interception.** Every AI-generated medication order is intercepted before it is executed or transmitted downstream to pharmacy or patient care systems.

**Live EPR validation.** Orders are validated against live patient data fetched directly from the EPR via FHIR R4, not from stale or cached records. Sentra does not trust the AI's internal logic; it checks the order against the patient's actual record at the moment of execution.

**Behavioral risk scoring.** Sentra evaluates cumulative risk using operational signals: abnormal dosage patterns, unusual access behavior, conflicting patient records, repeated override attempts, and workflow anomalies.

**Runtime intervention.** Based on policy evaluation and risk thresholds, each action is allowed, blocked, or escalated for human review. Escalation is risk-scored to fight alert fatigue: only high-confidence, high-severity flags reach a clinician, and when they do, the system cannot proceed without explicit human sign-off.

**Auditability and traceability.** Every action, block, escalation, and override is logged and timestamped. These logs are more than operational records. They serve as legal evidence of human oversight compliance under the EU AI Act.

Sentra does not sit inside the AI tool. An AI system governing its own outputs is like asking someone to mark their own exam. Sentra sits between the AI and execution precisely because independence is what makes governance meaningful. The separation also creates clean legal accountability between the AI vendor, the governance layer, and the hospital.

## Technical Architecture

Sentra is a lightweight middleware layer that integrates via standard FHIR R4 APIs and is compatible with Epic, Oracle Health, and CompuGroup Medical out of the box. Security and integration follow the standards EHR marketplaces already require: FHIR R4 with SMART on FHIR, and OAuth 2.0 for authentication and authorization. Validation decisions are returned in under 100 milliseconds, below the threshold of clinical workflow disruption.

The processing pipeline runs in sequence for every AI-generated medication order:

1. **Interception layer.** Captures the medication action before it is transmitted to downstream execution systems.
2. **Validation engine.** Fetches live patient data via FHIR R4 and checks the order against hard clinical rules. The engine operates entirely independently of the AI model generating the order. Hard clinical rules form a floor that no hallucination can bypass. Allergy conflicts and clinical dosing rules are checked today; patient identity verification, drug-drug interaction checks, and EPR consistency validation are on the immediate roadmap.
3. **Behavioral risk scoring.** Accumulates risk signals across actions, including dosage anomalies, access patterns, record conflicts, and override attempts, rather than evaluating each order in isolation.
4. **Decision engine.** Applies policy and risk thresholds to return one of three outcomes: allow, block, or escalate.
5. **Escalation workflow.** Escalated orders halt until a clinician provides explicit sign-off. Every override is logged, timestamped, and auditable.
6. **Audit log.** An immutable record of all actions, interventions, and escalation events, designed to serve as regulatory evidence of human oversight.

An initial MVP has been developed and open-sourced as a runtime governance prototype for autonomous AI systems, demonstrating real-time interception, rule-based policy evaluation, cumulative behavioral risk scoring, runtime intervention, audit logging, and containment workflows.

## Innovation and Differentiation

**Runtime, not reactive.** Existing healthcare AI governance is built on static compliance frameworks, manual oversight, and post-incident review. Sentra intervenes during live execution, before an unsafe action reaches the pharmacy. That category of infrastructure does not exist in this market today.

**Independent by design.** Governance embedded inside an AI tool can only govern that tool, and a model that hallucinates may not recognize its own error. Sentra validates outputs against live EPR data with no dependency on the AI model's internal logic. Independence also produces clean liability separation: contractual responsibility is clearly divided between the AI vendor, Sentra, and the hospital.

**Platform-agnostic.** Because Sentra sits between any AI prescription system and any EHR via standard FHIR R4 APIs, one governance layer can serve multiple AI tools across Epic, Oracle Health, and CompuGroup Medical environments.

**Designed against alert fatigue.** Not every anomaly creates an alert. Risk-scored escalation means only high-confidence, high-severity flags reach a clinician, addressing the automation bias and alert fatigue that undermine most clinical decision support tools.

**Audit logs as legal evidence.** Sentra's logs are what a vendor presents to a regulator to demonstrate compliance with EU AI Act human oversight obligations. This turns governance from a cost center into compliance infrastructure that reduces liability exposure for EHR vendors and AI companies.

**Modular and regulation-ready.** Regulations and standards will keep evolving. As a separate middleware layer, Sentra can be updated, audited, and replaced independently, without touching the clinical AI tools or the EHR.

## Implementation Plan

An open-sourced MVP already exists. The proof-of-concept phase adapts it to a simulated AI-assisted medication management workflow in three phases:

- **Phase 1: Medication workflow scenario.** Simulate an AI-assisted prescription workflow, define patient medication scenarios (including injected allergy conflicts, dosage anomalies, and wrong-patient orders), and integrate EPR validation logic over FHIR R4.
- **Phase 2: Runtime governance integration.** Connect medication actions to Sentra, evaluate behavioral risk patterns, and trigger intervention and escalation scenarios end to end.
- **Phase 3: Demonstration and visualization.** Build a live monitoring dashboard, demonstrate blocked and escalated medication actions, and present the operational governance architecture.

Beyond the proof of concept, commercialization follows two well-defined certification pathways. We are not inventing a standard; we are plugging into ones that already exist. First, Epic Marketplace certification through Epic's vendor validation process: FHIR R4 and SMART on FHIR integration compliance, OAuth 2.0 security validation, sandbox testing, and workflow compatibility checks. The process typically takes 3 to 12 months. Second, EU AI Act conformity assessment conducted by an accredited EU Notified Body such as TÜV SÜD, which is already established in medical device certification under the MDR. Professional liability and cyber insurance coverage are part of the commercialization plan before any clinical deployment.

The test market is Berlin, specifically the Epic EPR rollout at Charité. It is the highest-risk transition environment in Germany right now, the most credible proof-of-concept address in European healthcare, and the regulatory deadline is nine weeks away. A secondary test market is UK NHS trusts, which report over 34,000 medication errors per year and are actively investing in digital infrastructure.

## Evaluation Metrics

The proof of concept will be evaluated against six KPIs covering performance, safety, and usability:

- **Decision latency.** Validation decisions returned in under 100 milliseconds, the threshold below which clinical workflow is not disrupted.
- **Detection rate.** Percentage of injected unsafe orders (allergy conflicts, dosage anomalies, wrong-patient and duplicate orders) caught before execution. Target: 100% of hard-rule violations blocked.
- **False positive rate.** Percentage of legitimate medication orders incorrectly blocked or escalated. This is the key workflow-friction risk; the goal is to keep it low enough that clinicians trust the system rather than route around it.
- **Escalation precision.** Share of escalations a reviewing clinician confirms as warranted. This is the direct measure of whether risk-scored escalation prevents alert fatigue.
- **Audit completeness.** 100% of actions, blocks, escalations, and overrides logged, timestamped, and traceable, which is the standard the logs must meet to function as regulatory evidence.
- **Availability.** Sustained uptime of the governance layer under simulated workflow load, since an unavailable governance layer cannot be a single point of failure for prescribing.

## Financial Projections

The demand driver is regulatory and non-negotiable: EU AI Act non-compliance penalties reach €15 million or 3% of global turnover, and the human-oversight obligations take effect August 2, 2026. Vendors who cannot build governance in time will buy it. That compresses the sales cycle and shapes a go-to-market that avoids slow hospital procurement entirely in its first two phases.

**Revenue streams.** Four streams, phased with the go-to-market: (1) SaaS subscriptions charged monthly or annually per EHR vendor or AI platform; (2) marketplace module revenue through revenue share or flat licensing via the Epic Showroom and Oracle Health marketplaces; (3) API integration fees with per-call or tiered pricing for AI clinical software vendors; and (4) compliance reporting as an add-on audit log and regulatory reporting service.

**Revenue phasing.** Phase 1 covers the first 12 months: marketplace entry via Epic certification. Customer acquisition cost stays low because Sentra ships with products hospitals already buy, which removes the separate procurement cycle. Phase 2 runs from months 6 to 18: API-based B2B SaaS contracts with AI medication management vendors who need EU AI Act compliance built in before the deadline. Phase 3 starts at month 18: direct enterprise contracts with hospital networks and university medical centers, with a Charité pilot serving as a globally recognized validation signal.

**Cost structure.** Principal costs are engineering (validation engine, integrations, dashboard), Epic vendor certification (3 to 12 months of integration and sandbox work), EU AI Act conformity assessment through a Notified Body, professional liability and cyber insurance, and cloud infrastructure sized for low-latency validation.

**Value beyond revenue.** For customers, Sentra reduces medication-related operational risk and liability exposure: under the EU AI Act and the revised Product Liability Directive, documented and auditable governance is how AI vendors and EHR platforms demonstrate they met their human-oversight obligations. That liability reduction is the core of the business case for every buyer in the chain.

## Conclusion

As AI systems gain greater influence over clinical and operational workflows, the question every vendor and hospital will have to answer is simple: how do you know your AI didn't hurt anyone? Today, nothing in the stack can answer it. Governance is reactive, oversight is manual, and traditional cybersecurity does not watch AI decisions in real time.

Sentra is the answer: an independent runtime governance layer that intercepts AI-generated medication actions, validates them against live patient data, and blocks or escalates unsafe behavior before it reaches the pharmacy, with audit logs that double as legal evidence of human oversight. It is not just a patient safety tool; it is compliance infrastructure for the AI-powered healthcare platform ecosystem, arriving exactly as the EU AI Act makes that infrastructure mandatory. With a working MVP, defined certification pathways, and Berlin's Charité Epic rollout as the test market, Sentra demonstrates a scalable model for safer AI adoption in regulated European healthcare and strengthens Berlin's position as the place where trustworthy healthcare AI gets built. The regulatory clock is already running.
