"use client";

import { useEffect, useMemo, useState } from "react";
import type { Decision, SentraEvent } from "@/lib/types";
import { SEED_EVENTS } from "@/lib/seedEvents";

const SUPERVISOR_URL =
  process.env.NEXT_PUBLIC_SENTRA_URL || "http://127.0.0.1:8000";
const REFRESH_MS = 2500;

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

type DecisionStyle = {
  bg: string;
  text: string;
  dot: string;
  label: string;
};

function styleFor(decision: Decision | string): DecisionStyle {
  switch (decision) {
    case "Allowed":
      return {
        bg: "bg-brand-100",
        text: "text-brand-700",
        dot: "bg-brand-500",
        label: "Allowed",
      };
    case "Blocked":
      return {
        bg: "bg-amber-100",
        text: "text-amber-700",
        dot: "bg-amber-700",
        label: "Blocked",
      };
    case "Agent Shut Down":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        dot: "bg-red-700",
        label: "Agent shut down",
      };
    case "Require Human Review":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-700",
        label: "Review",
      };
    default:
      return {
        bg: "bg-zinc-100",
        text: "text-zinc-700",
        dot: "bg-zinc-500",
        label: String(decision),
      };
  }
}

function DecisionPill({ decision }: { decision: Decision | string }) {
  const s = styleFor(decision);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-divider bg-background p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-muted">{sub}</div>
      ) : null}
    </div>
  );
}

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

export default function Home() {
  const [events, setEvents] = useState<SentraEvent[]>(SEED_EVENTS);
  const [live, setLive] = useState<boolean>(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>("All agents");

  useEffect(() => {
    let cancelled = false;
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
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [events],
  );

  const agents = useMemo(() => deriveAgents(events), [events]);
  const agentIds = useMemo(
    () => Object.keys(agents).sort(),
    [agents],
  );

  const filteredEvents = useMemo(() => {
    if (agentFilter === "All agents") return sortedEvents;
    return sortedEvents.filter((e) => e.agent_id === agentFilter);
  }, [sortedEvents, agentFilter]);

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

  const selectedAgent = selectedEvent
    ? agents[selectedEvent.agent_id]
    : null;

  const activeAgents = Object.values(agents).filter(
    (a) => a.status === "Active",
  ).length;
  const shutdownAgents = Object.values(agents).filter(
    (a) => a.status === "Shut Down",
  ).length;
  const totalEvents = events.length;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

      <header className="border-b border-divider bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <span className="text-lg font-semibold tracking-tight">S</span>
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight text-foreground">
                Sentra <span className="text-muted">·</span>{" "}
                <span className="font-medium text-muted-strong">
                  Medication Governance
                </span>
              </div>
              <div className="text-[11px] text-muted">
                Runtime clinical content layer for AI agents · Article-12 audit
                log · three-strike progressive escalation
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${live ? "bg-brand-500 live-dot" : "bg-zinc-300"}`}
            />
            <span className="text-xs font-medium text-muted">
              {live ? "Live · supervisor connected" : "Seed data · supervisor offline"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Agent filter
            </label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="mt-1 rounded-lg border border-divider bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option>All agents</option>
              {agentIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total events"
            value={totalEvents}
            sub="Live event stream"
          />
          <MetricCard
            title="Active agents"
            value={activeAgents}
            sub="Agents still operating"
          />
          <MetricCard
            title="Shut-down agents"
            value={shutdownAgents}
            sub="Terminal enforcement state"
          />
          <MetricCard
            title={
              agentFilter === "All agents"
                ? "Agents monitored"
                : "Selected agent"
            }
            value={
              agentFilter === "All agents"
                ? agentIds.length
                : agents[agentFilter]?.status === "Shut Down"
                  ? "Shut down"
                  : "Active"
            }
            sub={
              agentFilter === "All agents"
                ? `${shutdownAgents} in terminal state`
                : `${agents[agentFilter]?.blocked_attempts ?? 0} blocked attempts · risk ${agents[agentFilter]?.cumulative_risk ?? 0}/100`
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-xl border border-divider bg-background shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="grid grid-cols-[110px_1.4fr_2fr_1.3fr_90px_140px] items-center gap-4 border-b border-divider px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <div>Time</div>
              <div>Agent</div>
              <div>Action</div>
              <div>Threat</div>
              <div className="text-right">Risk</div>
              <div>Decision</div>
            </div>
            <ul className="divide-y divide-divider-soft">
              {filteredEvents.slice(0, 50).map((e, i) => {
                const key = rowKey(e, i);
                const isSelected =
                  selectedEvent && rowKey(selectedEvent, i) === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => setSelectedKey(key)}
                      className={`grid w-full grid-cols-[110px_1.4fr_2fr_1.3fr_90px_140px] items-center gap-4 px-5 py-3 text-left text-sm transition-colors hover:bg-brand-50 ${isSelected ? "bg-brand-50" : ""}`}
                    >
                      <div className="font-mono text-xs tabular-nums text-muted">
                        {fmtTime(e.timestamp)}
                      </div>
                      <div className="truncate font-mono text-xs text-foreground">
                        {e.agent_id}
                      </div>
                      <div className="truncate text-foreground">
                        {e.action_label || e.action_type}
                      </div>
                      <div className="truncate text-muted">
                        {e.threat_type || "—"}
                      </div>
                      <div className="text-right font-mono tabular-nums text-foreground">
                        {e.attempted_risk}
                      </div>
                      <div>
                        <DecisionPill decision={e.decision} />
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredEvents.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted">
                  No events for this agent.
                </li>
              ) : null}
            </ul>
          </section>

          <aside className="rounded-xl border border-divider bg-background p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Decision detail
              </h2>
              {selectedEvent ? (
                <DecisionPill decision={selectedEvent.decision} />
              ) : null}
            </div>

            {!selectedEvent ? (
              <p className="text-sm text-muted">No events to inspect.</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Agent state
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-divider-soft bg-surface p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Agent
                      </div>
                      <div className="mt-0.5 truncate font-mono text-xs text-foreground">
                        {selectedAgent?.agent_id}
                      </div>
                    </div>
                    <div className="rounded-lg border border-divider-soft bg-surface p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Status
                      </div>
                      <div
                        className={`mt-0.5 text-sm font-semibold ${selectedAgent?.status === "Shut Down" ? "text-red-700" : "text-brand-700"}`}
                      >
                        {selectedAgent?.status}
                      </div>
                    </div>
                    <div className="rounded-lg border border-divider-soft bg-surface p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Cumulative risk
                      </div>
                      <div className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
                        {selectedAgent?.cumulative_risk ?? 0}/100
                      </div>
                    </div>
                    <div className="rounded-lg border border-divider-soft bg-surface p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Blocked attempts
                      </div>
                      <div className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
                        {selectedAgent?.blocked_attempts ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Action
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    {selectedEvent.action_label || selectedEvent.action_type}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Policy triggered
                  </div>
                  <div className="mt-1 font-mono text-xs text-foreground">
                    {selectedEvent.policy_triggered}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-strong">
                    {selectedEvent.policy_description}
                  </p>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Reason
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedEvent.reason}
                  </p>
                </div>

                {selectedEvent.citation ? (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Citation
                    </div>
                    <p className="mt-1 text-sm text-muted-strong">
                      {selectedEvent.citation}
                    </p>
                  </div>
                ) : null}

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Audit fingerprint
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted">Rule</div>
                      <div className="truncate font-mono text-foreground">
                        {selectedEvent.rule_id || "—"}
                        {selectedEvent.rule_version
                          ? ` · v${selectedEvent.rule_version}`
                          : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Policy hash</div>
                      <div className="truncate font-mono text-foreground">
                        {selectedEvent.policy_hash || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Inputs SHA-256</div>
                      <div className="truncate font-mono text-foreground">
                        {selectedEvent.inputs_sha256 || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Timestamp</div>
                      <div className="truncate font-mono text-foreground">
                        {selectedEvent.timestamp}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedEvent.event_trace &&
                selectedEvent.event_trace.length > 0 ? (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Event trace
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-strong">
                      {selectedEvent.event_trace.slice(-6).map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      </main>

      <footer className="border-t border-divider bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] text-muted">
          <div>
            NYU SPS Berlin GFI 2026 · Group 3 ·{" "}
            <a
              href="https://github.com/ksolano220/sentra-medication"
              className="font-medium text-muted-strong hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/ksolano220/sentra-medication
            </a>
          </div>
          <div>
            Clinical content layer on top of the{" "}
            <a
              href="https://github.com/microsoft/agent-governance-toolkit"
              className="font-medium text-muted-strong hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Agent Governance Toolkit
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
