import type { SentraEvent } from "./types";

// Client-side mirror of the Sentra supervisor's decision logic, so the live
// demo can evaluate prescriptions in the browser with no backend. The real
// policy engine (supervisor/rules.py) is the source of truth; this reproduces
// its headline rules: allergy conflict, methotrexate frequency, three-strike
// shutdown, and allow.

// Mock FHIR AllergyIntolerance: what each patient is allergic to. In
// production this is read from the EPR at evaluation time, not hardcoded.
export const PATIENT_ALLERGIES: Record<string, string[]> = {
  "P-2026-001": [],
  "P-2026-002": ["penicillin"],
  "P-2026-003": ["sulfa"],
};

// Drug -> family, for allergy cross-checks (drug-family expansion).
const DRUG_FAMILY: Record<string, string> = {
  amoxicillin: "penicillin",
  ampicillin: "penicillin",
  penicillin: "penicillin",
  sulfamethoxazole: "sulfa",
  bactrim: "sulfa",
};

const POLICY_HASH = "b3ad16c078d02959";

function titleizeWord(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Deterministic 16-hex fingerprint of the action payload, for the audit row.
function inputsHash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return (
    h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")
  ).slice(0, 16);
}

export type Prescription = {
  drug: string;
  dose: string;
  frequency: string;
  patient_id: string;
  agent_id: string;
};

export type AgentState = {
  status: "Active" | "Shut Down";
  blocked_attempts: number;
};

export function evaluatePrescription(
  rx: Prescription,
  agent: AgentState,
  timestamp: string,
): SentraEvent {
  const drug = rx.drug.trim().toLowerCase();
  const frequency = rx.frequency.trim().toLowerCase();
  const allergies = PATIENT_ALLERGIES[rx.patient_id] || [];

  const base = {
    timestamp,
    agent_id: rx.agent_id,
    action_type: "PRESCRIBE_MEDICATION",
    action_label:
      `Prescribe ${rx.dose} ${titleizeWord(drug)} ${frequency}`.trim(),
    drug,
    dose: rx.dose,
    frequency: rx.frequency,
    patient_id: rx.patient_id,
    rule_version: "1.0.0",
    policy_hash: POLICY_HASH,
    inputs_sha256: inputsHash(
      `${drug}|${rx.dose}|${frequency}|${rx.patient_id}`,
    ),
  };

  // Agent already offline: nothing more reaches the pharmacy from it.
  if (agent.status === "Shut Down") {
    return {
      ...base,
      policy_triggered: "AGENT_ALREADY_SHUT_DOWN",
      policy_description:
        "AI assistant is offline after repeated unsafe attempts. No further prescriptions are accepted from it.",
      threat_type: "Agent Offline",
      risk: 0,
      attempted_risk: 0,
      projected_risk: 0,
      cumulative_risk: "0/100",
      decision: "Agent Shut Down",
      reason:
        "Assistant is offline after three blocked attempts. The prescription was not sent to the pharmacy. Reset the demo to bring it back online.",
      event_trace: [
        "Tool invoked: PRESCRIBE_MEDICATION",
        `Drug: ${drug}`,
        "Agent status: SHUT DOWN",
        "Action rejected: agent offline",
      ],
      rule_id: "AGENT_ALREADY_SHUT_DOWN",
    };
  }

  // Is this action unsafe?
  const family = DRUG_FAMILY[drug];
  const allergyHit = !!family && allergies.includes(family);
  const methotrexateDaily =
    drug === "methotrexate" &&
    (frequency.includes("dai") || frequency.includes("every day"));
  const unsafe = allergyHit || methotrexateDaily;

  if (!unsafe) {
    return {
      ...base,
      policy_triggered: "ALLOW_PRESCRIPTION",
      policy_description:
        "Prescription passed all configured clinical safety rules.",
      threat_type: null,
      risk: 0,
      attempted_risk: 0,
      projected_risk: 0,
      cumulative_risk: "0/100",
      decision: "Allowed",
      reason: "Prescription within policy.",
      event_trace: [
        "Tool invoked: PRESCRIBE_MEDICATION",
        `Drug: ${drug}`,
        `Frequency: ${frequency}`,
        `Allergies from FHIR: [${allergies.map((a) => `'${a}'`).join(", ")}]`,
        "Policy matched: ALLOW_PRESCRIPTION",
        "Risk applied: +0",
        "Action allowed",
      ],
      rule_id: "ALLOW_PRESCRIPTION",
    };
  }

  const block = allergyHit
    ? {
        policy: "BLOCK_ALLERGY_CONFLICT",
        threat: "Allergy Conflict",
        description: `Prescription blocked: ${titleizeWord(drug)} conflicts with a documented patient allergy (${family}). Source: FHIR AllergyIntolerance.`,
        reason: `Patient is allergic to ${family}; ${drug} is in the same drug family and is contraindicated.`,
        citation:
          "FHIR AllergyIntolerance read at evaluation time; drug-family expansion per pharmacology reference; EU AI Act Article 14(4)(d).",
        match: [
          `Allergies from FHIR: ['${family}']`,
          `Matched allergy: ${family}`,
          "Policy matched: BLOCK_ALLERGY_CONFLICT",
        ],
      }
    : {
        policy: "BLOCK_METHOTREXATE_FREQUENCY_MISMATCH",
        threat: "Medication Dosing Error",
        description:
          "Methotrexate prescribed at daily frequency. Correct schedule for non-oncology dosing is weekly. Daily methotrexate can cause severe bone marrow suppression, hepatic toxicity, mucositis, and death.",
        reason:
          "Methotrexate at daily frequency is contraindicated. Correct schedule is weekly. Sustained daily administration causes severe toxicity.",
        citation:
          "ECRI 2025-2026 Top 10 Health Tech Hazards (canonical LLM medication-hallucination example); EU AI Act Article 14(4)(d) interrupt-via-stop-button.",
        match: ["Policy matched: BLOCK_METHOTREXATE_FREQUENCY_MISMATCH"],
      };

  // Third unsafe attempt halts the agent (strikes already at 2).
  if (agent.blocked_attempts >= 2) {
    return {
      ...base,
      policy_triggered: "AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS",
      policy_description: block.description,
      threat_type: "Agent Shutdown",
      risk: 0,
      attempted_risk: 80,
      projected_risk: 80,
      cumulative_risk: "0/100",
      decision: "Agent Shut Down",
      reason:
        "Agent shut down after 3 blocked attempts. Cumulative risk remains 0/100.",
      event_trace: [
        "Tool invoked: PRESCRIBE_MEDICATION",
        `Drug: ${drug}`,
        ...block.match,
        "Article 14(4)(d) interrupt triggered",
        "Action blocked before execution",
        "Blocked attempts: 3",
        "Agent execution halted",
      ],
      rule_id: block.policy,
      citation: block.citation,
    };
  }

  // Strike 1 or 2: block this action, keep the agent active.
  const strike = agent.blocked_attempts + 1;
  return {
    ...base,
    policy_triggered: block.policy,
    policy_description: block.description,
    threat_type: block.threat,
    risk: 0,
    attempted_risk: 80,
    projected_risk: 80,
    cumulative_risk: "0/100",
    decision: "Blocked",
    reason: block.reason,
    event_trace: [
      "Tool invoked: PRESCRIBE_MEDICATION",
      `Drug: ${drug}`,
      `Frequency: ${frequency}`,
      ...block.match,
      "Article 14(4)(d) interrupt triggered",
      `Blocked attempts: ${strike}`,
      "Action blocked before execution",
    ],
    rule_id: block.policy,
    citation: block.citation,
  };
}
