export type Decision =
  | "Allowed"
  | "Blocked"
  | "Agent Shut Down"
  | "Require Human Review";

export type SentraEvent = {
  timestamp: string;
  agent_id: string;
  action_type: string;
  action_label?: string;
  target?: string;
  amount?: number | null;
  notification_type?: string;
  data_classification?: string;
  destination_type?: string;
  drug?: string;
  dose?: string;
  frequency?: string;
  patient_id?: string;
  policy_triggered: string;
  policy_description?: string;
  threat_type?: string | null;
  risk: number;
  attempted_risk: number;
  projected_risk?: number;
  cumulative_risk?: string;
  decision: Decision;
  reason: string;
  event_trace?: string[];
  rule_id?: string;
  rule_version?: string;
  policy_hash?: string;
  inputs_sha256?: string;
  citation?: string;
};

export type AgentSummary = {
  agent_id: string;
  status: "Active" | "Shut Down";
  cumulative_risk: number;
  blocked_attempts: number;
  total_actions: number;
  last_event_timestamp: string;
};
