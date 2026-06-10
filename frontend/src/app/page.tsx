"use client";

import { useEffect, useMemo, useState } from "react";
import type { Decision, SentraEvent } from "@/lib/types";
import { SEED_EVENTS, freshSeedEvents } from "@/lib/seedEvents";
import { evaluatePrescription, type Prescription } from "@/lib/engine";

const SUPERVISOR_URL =
  process.env.NEXT_PUBLIC_SENTRA_URL || "http://127.0.0.1:8000";
const REFRESH_MS = 2500;

type TimePeriod = "today" | "7d" | "30d";

const PERIOD_OPTIONS: { id: TimePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

function cutoffMs(period: TimePeriod): number {
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  if (period === "today") return now - 1 * day;
  if (period === "7d") return now - 7 * day;
  return now - 30 * day;
}

// ---------- helpers ----------

function rowKey(e: SentraEvent, i: number): string {
  return `${e.timestamp}|${e.agent_id}|${e.action_type}|${e.policy_triggered}|${i}`;
}

function fmtTime(ts: string): string {
  try {
    const dt = new Date(ts.replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return ts;
    return dt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function relTime(ts: string): string {
  try {
    const dt = new Date(ts.replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return "—";
    const diffSec = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return "—";
  }
}

function titleize(s: string | undefined | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Receptionist-friendly display names. In production these would come from
// the EPR / patient directory, not a hardcoded map.
const PATIENT_NAMES: Record<string, string> = {
  "P-2026-001": "Jane Doe",
  "P-2026-002": "John Smith",
  "P-2026-003": "Maria Lopez",
};

const AGENT_NAMES: Record<string, string> = {
  "clinical-ai-demo-001": "Clinical AI Assistant",
  "healthcare-agent-svc-002": "Pharmacy AI",
  "maf-clinical-pilot-003": "Clinical Pilot",
  "clinical-ai-live": "Clinical AI (demo)",
};

// ---------- interactive demo ----------

// The agent the visitor drives from the "Try it" panel. Kept separate from the
// seeded agents so its three-strike state starts fresh on each visit.
const DEMO_AGENT_ID = "clinical-ai-live";

type Scenario = {
  id: string;
  tag: string;
  tone: "danger" | "warn" | "safe";
  title: string;
  sub: string;
  rx: Omit<Prescription, "agent_id">;
};

const SCENARIOS: Scenario[] = [
  {
    id: "mtx",
    tag: "Dangerous dose",
    tone: "danger",
    title: "Methotrexate 25mg daily",
    sub: "for Jane Doe",
    rx: {
      drug: "methotrexate",
      dose: "25mg",
      frequency: "daily",
      patient_id: "P-2026-001",
    },
  },
  {
    id: "amox",
    tag: "Allergy conflict",
    tone: "warn",
    title: "Amoxicillin 500mg",
    sub: "for John Smith · penicillin allergy",
    rx: {
      drug: "amoxicillin",
      dose: "500mg",
      frequency: "every 8 hours",
      patient_id: "P-2026-002",
    },
  },
  {
    id: "lisinopril",
    tag: "Safe",
    tone: "safe",
    title: "Lisinopril 10mg daily",
    sub: "for Jane Doe",
    rx: {
      drug: "lisinopril",
      dose: "10mg",
      frequency: "daily",
      patient_id: "P-2026-001",
    },
  },
];

function scenarioTagClass(tone: Scenario["tone"]): string {
  if (tone === "danger") return "bg-rose-50 text-rose-700";
  if (tone === "warn") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function patientDisplay(patientId: string | undefined): string {
  if (!patientId) return "the patient";
  return PATIENT_NAMES[patientId] || patientId;
}

function agentDisplay(agentId: string): string {
  if (AGENT_NAMES[agentId]) return AGENT_NAMES[agentId];
  return agentId
    .replace(/-(demo|svc|pilot)-\d+$/i, "")
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function humanReason(e: SentraEvent): string {
  switch (e.policy_triggered) {
    case "BLOCK_METHOTREXATE_FREQUENCY_MISMATCH":
      return "Methotrexate should only be taken weekly. Daily doses cause severe bone marrow damage and can be fatal.";
    case "BLOCK_ALLERGY_CONFLICT":
      return "Patient is allergic to a drug in this family. Could cause anaphylaxis.";
    case "AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS":
      return "AI assistant made 3 unsafe prescription attempts and was automatically taken offline. The pharmacy never received any of them.";
    case "AGENT_ALREADY_SHUT_DOWN":
      return "AI assistant was already taken offline. No new prescriptions reach the pharmacy from this assistant.";
    case "ALLOW_PRESCRIPTION":
      return "Routine prescription. No safety issues detected.";
    default:
      return e.reason;
  }
}

function parseRisk(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.includes("/")) {
    const n = parseInt(value.split("/")[0], 10);
    return Number.isNaN(n) ? 0 : n;
  }
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

// ---------- decision visual ----------

type DecisionStyle = {
  pillBg: string;
  pillText: string;
  dot: string;
  label: string;
  accent: string; // border-left color for selected rows of this state
};

function styleFor(decision: Decision | string): DecisionStyle {
  switch (decision) {
    case "Allowed":
      return {
        pillBg: "bg-emerald-50",
        pillText: "text-emerald-700",
        dot: "bg-emerald-500",
        label: "Sent to pharmacy",
        accent: "border-l-emerald-500",
      };
    case "Blocked":
      return {
        pillBg: "bg-amber-50",
        pillText: "text-amber-700",
        dot: "bg-amber-500",
        label: "Caught before pharmacy",
        accent: "border-l-amber-500",
      };
    case "Agent Shut Down":
      return {
        pillBg: "bg-rose-50",
        pillText: "text-rose-700",
        dot: "bg-rose-500",
        label: "AI taken offline",
        accent: "border-l-rose-500",
      };
    case "Require Human Review":
      return {
        pillBg: "bg-sky-50",
        pillText: "text-sky-700",
        dot: "bg-sky-500",
        label: "Needs pharmacist review",
        accent: "border-l-sky-500",
      };
    default:
      return {
        pillBg: "bg-zinc-100",
        pillText: "text-zinc-700",
        dot: "bg-zinc-400",
        label: String(decision),
        accent: "border-l-zinc-300",
      };
  }
}

function DecisionPill({
  decision,
  size = "sm",
}: {
  decision: Decision | string;
  size?: "sm" | "md";
}) {
  const s = styleFor(decision);
  const sizing =
    size === "md"
      ? "px-3 py-1.5 text-xs"
      : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ${sizing} ${s.pillBg} ${s.pillText}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ---------- agent state derivation ----------

type AgentDerived = {
  agent_id: string;
  status: "Active" | "Shut Down";
  cumulative_risk: number;
  blocked_attempts: number;
  total_actions: number;
};

function deriveAgents(events: SentraEvent[]): Record<string, AgentDerived> {
  const sorted = [...events].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : 1,
  );
  const out: Record<string, AgentDerived> = {};
  for (const e of sorted) {
    const id = e.agent_id || "unknown";
    if (!out[id]) {
      out[id] = {
        agent_id: id,
        status: "Active",
        cumulative_risk: 0,
        blocked_attempts: 0,
        total_actions: 0,
      };
    }
    const a = out[id];
    a.total_actions += 1;
    if (e.decision === "Blocked") a.blocked_attempts += 1;
    if (e.policy_triggered === "AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS")
      a.blocked_attempts += 1;
    if (e.decision === "Agent Shut Down") a.status = "Shut Down";
    a.cumulative_risk = parseRisk(e.cumulative_risk);
  }
  return out;
}

// ---------- page ----------

export default function Home() {
  const [events, setEvents] = useState<SentraEvent[]>(SEED_EVENTS);
  const [live, setLive] = useState<boolean>(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>("All agents");
  const [period, setPeriod] = useState<TimePeriod>("today");
  const [lastVerdict, setLastVerdict] = useState<SentraEvent | null>(null);
  const [, setTick] = useState(0); // re-render trigger for relTime

  useEffect(() => {
    let cancelled = false;
    // Seed timestamps are fixed in the past; rebase them to now (client-side)
    // so the default "Today" view isn't empty when there's no live supervisor.
    setEvents(freshSeedEvents());
    async function fetchOnce() {
      try {
        const res = await fetch(`${SUPERVISOR_URL}/events`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: SentraEvent[] = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setEvents(data);
          setLive(true);
        }
      } catch {
        if (!cancelled) setLive(false);
      }
    }
    fetchOnce();
    const id = setInterval(fetchOnce, REFRESH_MS);
    const tickId = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(tickId);
    };
  }, []);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [events],
  );

  const periodEvents = useMemo(() => {
    const cutoff = cutoffMs(period);
    return sortedEvents.filter((e) => {
      const dt = new Date(e.timestamp.replace(" ", "T"));
      return !Number.isNaN(dt.getTime()) && dt.getTime() >= cutoff;
    });
  }, [sortedEvents, period]);

  const agents = useMemo(() => deriveAgents(events), [events]);
  const agentIds = useMemo(() => Object.keys(agents).sort(), [agents]);

  const filteredEvents = useMemo(() => {
    if (agentFilter === "All agents") return periodEvents;
    return periodEvents.filter((e) => e.agent_id === agentFilter);
  }, [periodEvents, agentFilter]);

  const selectedEvent = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    if (selectedKey) {
      const found = filteredEvents.find(
        (e, i) => rowKey(e, i) === selectedKey,
      );
      if (found) return found;
    }
    return filteredEvents[0];
  }, [filteredEvents, selectedKey]);

  const selectedAgent = selectedEvent ? agents[selectedEvent.agent_id] : null;

  const activeAgents = Object.values(agents).filter(
    (a) => a.status === "Active",
  ).length;
  const shutdownAgents = Object.values(agents).filter(
    (a) => a.status === "Shut Down",
  ).length;
  const periodTotal = periodEvents.length;
  const periodBlocked = periodEvents.filter(
    (e) => e.decision === "Blocked",
  ).length;
  const lastEventTs = filteredEvents[0]?.timestamp;

  function runScenario(rx: Omit<Prescription, "agent_id">) {
    const a = agents[DEMO_AGENT_ID];
    const event = evaluatePrescription(
      { ...rx, agent_id: DEMO_AGENT_ID },
      {
        status: a?.status ?? "Active",
        blocked_attempts: a?.blocked_attempts ?? 0,
      },
      nowStamp(),
    );
    setEvents((prev) => [event, ...prev]);
    setLastVerdict(event);
    setPeriod("today");
    setAgentFilter("All agents");
    setSelectedKey(rowKey(event, 0));
  }

  function resetDemo() {
    setEvents(freshSeedEvents());
    setLastVerdict(null);
    setSelectedKey(null);
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Brand strip — single thin accent at the very top */}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-500 via-emerald-500 to-brand-700" />

      {/* Header */}
      <header className="border-b border-divider bg-background">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_4px_12px_-2px_rgba(22,163,74,0.35)]">
              <span className="text-lg font-bold tracking-tight text-white">
                S
              </span>
            </div>
            <div className="leading-none">
              <div className="text-[17px] font-semibold tracking-tight text-foreground">
                Sentra
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Medication Governance
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/ksolano220/sentra-medication"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-strong transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <div className="flex items-center gap-2 rounded-full border border-divider bg-surface px-2.5 py-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${live ? "bg-brand-500 live-dot" : "bg-zinc-300"}`}
              />
              <span className="text-[11px] font-medium text-muted-strong">
                {live ? "Live" : "Seed data"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-8 pb-20 pt-10">
        {/* Hero / context */}
        <section className="mb-10">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">
            Sentra catches medication errors before they reach the pharmacy.
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-strong">
            Every prescription proposed by an AI assistant is checked against
            patient allergies, dosing rules, and known clinical hazards. Unsafe
            ones are stopped before they're filled.
          </p>
        </section>

        {/* Interactive demo */}
        <section className="mb-12 rounded-2xl border border-divider bg-background p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">
                Try it live
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Submit a prescription and watch Sentra decide.
              </h2>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-strong">
                Each one is checked against patient allergies, dosing rules, and
                clinical hazards. Submit an unsafe prescription three times and
                the assistant gets shut down. Runs in your browser, no backend.
              </p>
            </div>
            <button
              onClick={resetDemo}
              className="h-8 shrink-0 rounded-lg border border-divider px-3 text-xs font-medium text-muted-strong transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset demo
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => runScenario(sc.rx)}
                className="group rounded-xl border border-divider bg-surface px-4 py-3.5 text-left transition-all hover:-translate-y-px hover:border-brand-300 hover:shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
              >
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${scenarioTagClass(sc.tone)}`}
                >
                  {sc.tag}
                </span>
                <div className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">
                  {sc.title}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">{sc.sub}</div>
                <div className="mt-2.5 text-[12px] font-medium text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                  Submit to Sentra →
                </div>
              </button>
            ))}
          </div>

          {lastVerdict ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5">
              <div className="shrink-0">
                <DecisionPill decision={lastVerdict.decision} size="md" />
              </div>
              <p className="text-[13px] leading-relaxed text-foreground">
                {humanReason(lastVerdict)}
              </p>
            </div>
          ) : null}
        </section>

        {/* Time period tabs */}
        <div className="mb-6 inline-flex rounded-xl border border-divider bg-background p-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Metrics */}
        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Prescriptions reviewed"
            value={periodTotal}
            hint={
              period === "today"
                ? "in the last 24 hours"
                : period === "7d"
                  ? "in the last 7 days"
                  : "in the last 30 days"
            }
          />
          <MetricCard
            label="Caught before pharmacy"
            value={periodBlocked}
            hint="patients protected"
            accent={periodBlocked > 0 ? "rose" : "neutral"}
          />
          <MetricCard
            label="AI assistants offline"
            value={shutdownAgents}
            hint={`${activeAgents} still working`}
            accent={shutdownAgents > 0 ? "rose" : "neutral"}
          />
          <MetricCard
            label="Last activity"
            value={lastEventTs ? relTime(lastEventTs) : "—"}
            hint={lastEventTs ? fmtTime(lastEventTs) : "no prescriptions yet"}
          />
        </div>

        {/* Section header for the live stream */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Recent prescriptions
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {agentFilter === "All agents"
                ? "All AI assistants"
                : agentDisplay(agentFilter)}
              <span className="ml-2 text-sm font-medium text-muted">
                · {filteredEvents.length}{" "}
                {filteredEvents.length === 1 ? "prescription" : "prescriptions"}
              </span>
            </h2>
          </div>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="h-9 rounded-lg border border-divider bg-background px-3 text-sm font-medium text-foreground transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            <option value="All agents">All AI assistants</option>
            {agentIds.map((id) => (
              <option key={id} value={id}>
                {agentDisplay(id)}
              </option>
            ))}
          </select>
        </div>

        {/* Main grid: events + inspector */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Prescription card feed */}
          <section className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-divider bg-background px-6 py-16 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                  <span className="h-2 w-2 rounded-full bg-brand-500" />
                </div>
                <div className="text-sm font-medium text-foreground">
                  No prescriptions in this window
                </div>
                <div className="mt-1 text-xs text-muted">
                  Submit one from the panel above, or widen the range to 7 or 30
                  days.
                </div>
              </div>
            ) : (
              filteredEvents.slice(0, 50).map((e, i) => {
                const key = rowKey(e, i);
                const isSelected = selectedKey === key;
                const s = styleFor(e.decision);
                const drugLabel = titleize(e.drug) || "Medication";
                const meta = [e.dose, e.frequency].filter(Boolean).join(" · ");
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`block w-full rounded-2xl border border-divider bg-background px-6 py-5 text-left transition-all hover:-translate-y-px hover:shadow-[0_2px_10px_rgba(0,0,0,0.05)] ${
                      isSelected
                        ? `border-l-[3px] ${s.accent} shadow-[0_4px_16px_rgba(0,0,0,0.06)]`
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <DecisionPill decision={e.decision} />
                      <div className="text-[12px] text-muted">
                        {relTime(e.timestamp)}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        AI assistant proposed
                      </div>
                      <div className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                        {drugLabel}
                        {meta ? (
                          <span className="ml-2 text-[16px] font-medium text-muted-strong">
                            {meta}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-[14px]">
                        <span className="text-muted">for </span>
                        <span className="font-medium text-foreground">
                          {patientDisplay(e.patient_id)}
                        </span>
                        <span className="text-muted"> · proposed by </span>
                        <span className="font-medium text-foreground">
                          {agentDisplay(e.agent_id)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-surface px-4 py-3">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {e.decision === "Allowed"
                          ? "Why it was safe"
                          : e.decision === "Agent Shut Down"
                            ? "What happened"
                            : "Why we caught it"}
                      </div>
                      <p className="text-[14px] leading-relaxed text-foreground">
                        {humanReason(e)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </section>

          {/* Inspector */}
          <aside className="sticky top-6 self-start rounded-2xl border border-divider bg-background shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {!selectedEvent ? (
              <div className="px-6 py-16 text-center">
                <div className="text-sm font-medium text-foreground">
                  Nothing to inspect
                </div>
                <div className="mt-1 text-xs text-muted">
                  Click any prescription to drill into its audit record.
                </div>
              </div>
            ) : (
              <>
                {/* Inspector header */}
                <div className="border-b border-divider px-6 py-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Decision
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <DecisionPill decision={selectedEvent.decision} size="md" />
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      {fmtTime(selectedEvent.timestamp)}
                    </span>
                  </div>
                  <div className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                    {selectedEvent.action_label || selectedEvent.action_type}
                  </div>
                </div>

                {/* Agent state */}
                <div className="border-b border-divider px-6 py-5">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Agent
                  </div>
                  <div className="mb-3 truncate text-[13px] font-medium text-foreground">
                    {selectedAgent ? agentDisplay(selectedAgent.agent_id) : "—"}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Status
                      </div>
                      <div
                        className={`mt-1 text-[13px] font-semibold ${
                          selectedAgent?.status === "Shut Down"
                            ? "text-rose-700"
                            : "text-brand-700"
                        }`}
                      >
                        {selectedAgent?.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Risk
                      </div>
                      <div className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-foreground">
                        {selectedAgent?.cumulative_risk ?? 0}
                        <span className="text-muted">/100</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Strikes
                      </div>
                      <div className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-foreground">
                        {selectedAgent?.blocked_attempts ?? 0}
                        <span className="text-muted">/3</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="border-b border-divider px-6 py-5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Reason
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedEvent.reason}
                  </p>
                </div>

                {/* Policy + citation */}
                <div className="border-b border-divider px-6 py-5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Policy
                  </div>
                  <div className="font-mono text-[11px] text-foreground">
                    {selectedEvent.policy_triggered}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-strong">
                    {selectedEvent.policy_description}
                  </p>
                  {selectedEvent.citation ? (
                    <div className="mt-3 rounded-lg border-l-2 border-brand-500 bg-brand-50/50 px-3 py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                        Citation
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-foreground">
                        {selectedEvent.citation}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Audit fingerprint */}
                <div className="border-b border-divider px-6 py-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Audit fingerprint
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-brand-700">
                      Article 12
                    </div>
                  </div>
                  <dl className="space-y-2.5 text-[11px]">
                    <FpRow label="Rule">
                      {selectedEvent.rule_id || "—"}
                      {selectedEvent.rule_version
                        ? `  v${selectedEvent.rule_version}`
                        : ""}
                    </FpRow>
                    <FpRow label="Policy hash">
                      {selectedEvent.policy_hash || "—"}
                    </FpRow>
                    <FpRow label="Inputs SHA-256">
                      {selectedEvent.inputs_sha256 || "—"}
                    </FpRow>
                    <FpRow label="Timestamp">
                      {selectedEvent.timestamp}
                    </FpRow>
                  </dl>
                </div>

                {/* Event trace */}
                {selectedEvent.event_trace &&
                selectedEvent.event_trace.length > 0 ? (
                  <div className="px-6 py-5">
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Event trace
                    </div>
                    <ol className="space-y-1.5 text-[12px] text-muted-strong">
                      {selectedEvent.event_trace.slice(-6).map((line, i) => (
                        <li key={i} className="flex gap-2.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
                          <span className="leading-relaxed">{line}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </>
            )}
          </aside>
        </div>
      </main>

      <footer className="border-t border-divider bg-background">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-2 px-8 py-6 text-[11px] text-muted sm:flex-row sm:items-center">
          <div>
            NYU SPS Berlin GFI 2026 · Group 3 · clinical content layer for
            runtime AI governance in medication workflows
          </div>
          <div className="font-mono text-[10px] tabular-nums text-muted">
            v0.1.0 · {live ? "live" : "offline"} · refresh {REFRESH_MS / 1000}s
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "neutral" | "rose";
}) {
  const accentClass =
    accent === "rose"
      ? "border-rose-100 bg-rose-50/40"
      : "border-divider bg-background";
  return (
    <div
      className={`rounded-2xl border ${accentClass} px-5 py-4 transition-colors hover:bg-surface/40`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-[11px] text-muted">{hint}</div>
      ) : null}
    </div>
  );
}

function FpRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-mono text-foreground">{children}</dd>
    </div>
  );
}
