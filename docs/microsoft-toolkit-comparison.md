# Microsoft Agent Governance Toolkit vs Sentra

Honest technical comparison for the Berlin pitch. Read alongside [berlin-sprint-plan.md](./berlin-sprint-plan.md). Do not oversell Sentra: Microsoft engineers will catch it in 30 seconds.

- MS toolkit repo: `github.com/microsoft/agent-governance-toolkit` (MIT, published April 2, 2026)
- Sentra (this fork): `/Users/katherinesolano/sentra-medication`
- Sentra original: `/Users/katherinesolano/sentra`

Sources used below for MS internals (working from public README/docs/tutorials, no local clone): `agent-governance-python/agent-os/`, `docs/ARCHITECTURE.md`, `docs/tutorials/01-policy-engine.md`, `docs/tutorials/08-opa-rego-cedar-policies.md`, `docs/tutorials/07-mcp-security-gateway.md`, `docs/OWASP-COMPLIANCE.md`, `docs/packages/agent-compliance.md`, `examples/smolagents-governed`, `examples/crewai-governed`, `agent-governance-dotnet/README.md`. Cite these paths verbatim in the deck; do not paraphrase as if from the README.

---

## 1. Architecture comparison

| Dimension | Microsoft Agent Governance Toolkit | Sentra |
|---|---|---|
| **Interception** | Middleware pipeline plugged into the host framework. Canonical Python path: `agent_os.integrations.maf_adapter.GovernancePolicyMiddleware` (Microsoft Agent Framework), with parallel adapters for LangChain callback handlers, CrewAI task decorators, Google ADK plugins, AutoGen, OpenAI Agents SDK, Semantic Kernel, LangGraph, LlamaIndex, Haystack, Dify, smolagents. In-process: no network hop. | Out-of-process HTTP. `supervisor/main.py` `POST /agent-action` FastAPI endpoint; agent calls in via `sdk/client.py` `Sentra.evaluate()` or `@sentra.guard()` decorator. Hardcoded `http://127.0.0.1:8000`. One framework integration: Python decorator. |
| **Latency** | Claimed `<0.1 ms p99` for the policy decision (kernel-local, stateless). Sub-millisecond is the headline number in the April 2 announcement. | Untested. Local FastAPI roundtrip + JSON-file read for state. Realistic order-of-magnitude is 5-30 ms in-process, more under load (see Behavioral state row, file I/O on every call). |
| **Policy expression** | YAML (native), OPA Rego (`docs/tutorials/08`), Cedar (same tutorial). Single `PolicyEvaluator.evaluate()` can consult all three in one call. Built-in fallback evaluators ship for Rego and Cedar so OPA/Cedar binaries are optional. Policies are data: version, rules with field/operator/value conditions, actions (allow/deny/audit/block), priority, message, defaults. | Python `if-then` chain in `supervisor/rules.py` (~450 lines). One function `evaluate_action()` switches on `action_type`. No DSL, no declarative load, no policy version field. Adding a rule = code change + redeploy. |
| **Audit log** | Merkle hash-chain audit entries (`docs/ARCHITECTURE.md`): tool name, redacted params, result, timestamp, agent identity. OpenTelemetry span attributes for every policy decision (which policy, decision, reasoning). `agent-compliance` package maps audit content to HIPAA, EU AI Act, OWASP Agentic Top 10. | JSON event list appended to `supervisor/storage.py` `runtime_log.json`. Fields: `timestamp, agent_id, action_type, target, policy_triggered, policy_description, threat_type, risk, attempted_risk, cumulative_risk, decision, reason, event_trace[]`. No hash chain, no OTel, no signing. Article-12 shaping is aspirational right now, needs `rule_version`, `policy_hash`, `sha256` fields added Day 2 of the sprint (see `berlin-sprint-plan.md` minimal-credible-demo). |
| **Behavioral state / agent risk** | Out of scope as a first-class concept. The kernel is described as "stateless by design" so it can run as sidecar / serverless / behind a load balancer. Rogue-detection middleware exists (`RogueDetectionMiddleware`) but the published design treats each policy decision independently. No published cumulative-risk model, no progressive escalation ladder, no three-strike suspension as a built-in primitive. | First-class. `supervisor/risk.py`: per-agent `cumulative_risk`, `RISK_THRESHOLD=100`, `blocked_attempts`, `BLOCK_THRESHOLD=3`, status transitions `Active -> Agent Shut Down`. Persisted per `agent_id` in `state_store.json`. **This is Sentra's most genuinely differentiated primitive.** |
| **Extension points** | Middleware composition (`create_governance_middleware()` factory; stack of `GovernancePolicyMiddleware`, `AuditTrailMiddleware`, `CapabilityGuardMiddleware`, `RogueDetectionMiddleware`). Custom policy languages via the Rego/Cedar adapter pattern. YAML policy packs are just files in a directory loaded by `PolicyEvaluator.load_policies("./policies/")`. MCP security gateway (`docs/tutorials/07`). | Two extension points: (1) add a new branch to `evaluate_action()`, (2) add a new endpoint to `main.py`. No plugin loader, no policy file format, no callback hooks. `main.py` `/evaluate` adapter endpoint already shows the integration shape: translate a foreign payload into `AgentAction`, route through `handle_agent_action`. |
| **Language / SDK** | Python, TypeScript (`@microsoft/agentmesh-sdk` on npm), .NET (`Microsoft.AgentGovernance` on NuGet), Rust, Go. 13+ host frameworks. | Python only. One SDK class. |
| **Deployment** | Helm charts for AKS (agent-os, agent-mesh, agent-sre). Sidecar container pattern (two-container pod, localhost comms). Azure App Service guide. Stateless kernel, load balancer / serverless friendly. | `uvicorn supervisor.main:app`. No Dockerfile, no Helm, no Azure target. JSON-file state means horizontal scaling is broken, see honesty section below. |
| **License & governance** | MIT. Microsoft-owned today, stated aspiration to move to a foundation (LF AI & Data / CoSAI / OWASP ASI engagement). Open issue tracker, active. | MIT (LICENSE file). Single-maintainer NYU SPS student project. |

---

## 2. Where Microsoft is honestly better

Say these out loud in the pitch. Do not hedge.

1. **Latency.** Microsoft is in-process middleware with a stateless evaluator; Sentra is an HTTP roundtrip with file-backed state. Their <0.1 ms p99 claim is plausible from the architecture; Sentra's is not measured and would not match it.
2. **Policy expressiveness.** YAML + Rego + Cedar > a hand-rolled Python switch statement. Rego in particular gives you set algebra, joins against external data, and a query language that Sentra's chain of `if action_type == ...` cannot match. Policies are data, version-controllable, hot-reloadable, reviewable by non-Python clinicians.
3. **Ecosystem reach.** 13+ host framework integrations vs Sentra's one Python decorator. If the agent runs on LangGraph, CrewAI, AutoGen, .NET Semantic Kernel, or Google ADK, Microsoft already has the seam. Sentra would have to build it.
4. **Audit integrity.** Merkle hash-chain + OpenTelemetry spans is a stronger evidentiary substrate than Sentra's plain JSON append. For an EU AI Act Article 12 deployer log defended in a regulator inquiry, hash-chained > file-appended.
5. **Deployment maturity.** Helm charts, sidecar pattern, App Service guide, stateless scaling. Sentra has `uvicorn` and a JSON file (which has a concurrency race on `runtime_log.json`, read + append + write is not atomic in `storage.py`).
6. **Compliance breadth.** OWASP Agentic Top 10 coverage end-to-end, HIPAA / EU AI Act mappings as a published package (`agent-compliance`). Sentra has neither yet.
7. **Governance / longevity.** Microsoft-backed with a foundation path. A hospital procurement officer treats that risk profile as fundamentally different from a student project.

---

## 3. Where Sentra is genuinely differentiated

Anchored in code, not marketing.

1. **Cumulative per-agent risk + three-strike progressive escalation as a behavioral primitive, not a single allow/block.** `supervisor/risk.py:apply_risk()` carries state across calls: `cumulative_risk` accumulates `attempted_risk`, `RISK_THRESHOLD=100` triggers a block, `BLOCK_THRESHOLD=3` triggers `AGENT_SHUTDOWN_AFTER_REPEATED_BLOCKS` and flips status to `Agent Shut Down` (persisted in `state_store.json`). The MS toolkit's published middleware stack does not ship this pattern. It is a different mental model: not "is this call allowed" but "is this agent still trustworthy in this session." This maps cleanly to Article 14(4)(d)-(e) human-oversight ladder language: silent log, escalate (pharmacist co-sign), suspend.
2. **Clinical rule pack as the deliverable, not the engine.** The Berlin sprint Day-2 deliverable is methotrexate-frequency + allergy-conflict rules sourced from Fachinformationen, AkdÄ guidance, and ECRI's canonical-hallucination catalog. Microsoft ships the plumbing and explicitly does not ship clinical content. That asymmetry is the entire pitch.
3. **Article-12-shaped audit row as a deployer-side primitive.** Once the sprint adds `rule_id`, `rule_version`, `policy_hash`, `inputs_sha256`, `user`, `agent_id`, `citation` to each event in `storage.py:append_event()`, the audit row is shaped specifically for Article 26(5) six-month deployer retention with statutory citation per event, not a generic policy event. The MS audit row is hash-chained and trace-attached but is policy-decision-shaped, not regulator-letter-shaped.
4. **Simpler integration for a clinical pilot.** A pharmacist on a 5-person hospital innovation team can read `rules.py`, point at a line, and ask "why does this fire." They cannot read Rego. For pilot-stage clinical adoption that simplicity is an asset, not a deficiency.
5. **Fail-safe SDK default.** `sdk/client.py:Sentra.evaluate()` returns `Blocked` with `risk_score=100` on connection error. This is explicit and documented. MS toolkit's failure mode under kernel unavailability is not as plainly stated in the docs read so far.
6. **Priority of invention.** Sentra's first commit is Feb 27, 2026; the supervisor + rules + risk + three-strike was committed by March 12, 2026, five-plus weeks before April 2. Convergent design, not derivative. Use this quietly per the sprint plan, not as a lead claim.

What Sentra is **not** differentiated on (do not pitch these as advantages): interception speed, policy DSL, framework breadth, deployment maturity, audit cryptography.

---

## 4. Concrete integration patterns

Five paths. Effort estimates assume the current 5-person student team and the existing Sentra Python codebase.

### A. Sentra rules -> OPA Rego / Cedar policy pack loaded into MS toolkit

- **How:** Re-express the clinical rules as Rego or YAML files dropped into `PolicyEvaluator.load_policies("./policies/")`. Sentra becomes a "Sentra Clinical Policy Pack" published as a `.tar.gz` or pip-installable `policies/` directory. MS toolkit's `GovernancePolicyMiddleware` enforces them inside the host framework. Cumulative risk does **not** survive this path, Rego is stateless.
- **Feasibility:** Medium. The medication rules (dose range, frequency mismatch, allergy match) translate cleanly to Rego predicates over a JSON input. The three-strike behavior does not, it requires external state, which means either dropping it or asking the MS toolkit to add a stateful middleware hook.
- **Effort:** 3-5 person-days for two rules + a published Rego policy bundle + a sample plugging it into `examples/maf-governed/`.
- **MS extension points required:** `PolicyEvaluator.load_policies()` directory loader (already exists); Rego/Cedar adapters (already exist with built-in fallback evaluators).

### B. Sentra as sidecar service called via webhook / external policy

- **How:** Keep Sentra's Python supervisor + `risk.py` three-strike intact. Add an MS-toolkit-compatible middleware shim that forwards the action payload from `GovernancePolicyMiddleware` to Sentra's `POST /agent-action`, parses the response, returns allow/deny/audit/block to the MS pipeline. Sentra becomes an external policy decision point.
- **Feasibility:** Easy. `main.py` already has the `/evaluate` adapter endpoint shape (claim-workflow to AgentAction translator), a second adapter for the MS toolkit's middleware-context payload is the same pattern.
- **Effort:** 2-3 person-days for the shim + an example app. Cumulative risk + three-strike survive intact because Sentra is still the decision authority.
- **MS extension points required:** Custom middleware in the `create_governance_middleware()` stack, or the policy-engine plugin interface that the Rego/Cedar backends use.

### C. JSON/YAML clinical policy pack that either runtime can load

- **How:** Ship a vendor-neutral `sentra-clinical-policy-pack.yaml` (rules + citations + escalation hints) plus two loaders: one for Sentra's `rules.py`, one for MS's `PolicyEvaluator`. No engine. Pure content.
- **Feasibility:** Medium. Requires designing the shared schema (rule, condition, action, citation, escalation_tier), then maintaining two loaders, then keeping content stable across both. Worth doing only if the pitch lands and the policy pack becomes a product.
- **Effort:** 4-6 person-days for the schema + Sentra loader; another 2-3 for the MS-side YAML conversion. Not realistic inside the 5-day sprint.
- **MS extension points required:** The YAML policy file format is already supported; the work is on the Sentra side to converge on it.

### D. Two-layer: Sentra in front of (or behind) MS toolkit in the agent's tool-call path

- **How:** MS toolkit handles generic governance (OWASP Top 10, prompt-injection middleware, sandboxing, audit). Sentra runs as a second interceptor in the clinical-action path, either pre-MS (clinical veto first) or post-MS (clinical layer only sees calls MS already allowed). Both audit logs co-exist; the clinical audit is what gets handed to the Notified Body.
- **Feasibility:** Easy to demo, harder to operationalize (two policy systems, two failure modes, two audit logs to reconcile). Plays well on a slide. Plays less well at procurement.
- **Effort:** 1-2 person-days to wire for a demo (same shim as pattern B, just decide ordering). Real production work is in the reconciliation, not the wiring.
- **MS extension points required:** Same as B. Middleware ordering is a parameter to the middleware stack.

### E. Upstream contribution, Sentra as a clinical extension module / sample in MS toolkit

- **How:** Open a PR adding `examples/clinical-medication-governed/` or `agent-governance-python/integrations/clinical-rule-pack/` under MIT. Contents: the two medication rules in YAML, the Article-12 audit-row schema as an `AuditTrailMiddleware` config, a tutorial under `docs/tutorials/` showing the methotrexate scenario.
- **Feasibility:** Hard, but highest pitch-value. PR acceptance is on MS's timeline, not the sprint's. Also requires the team to actually run + test against MS's CI.
- **Effort:** 5-8 person-days post-sprint for a credible PR. Not in the 5-day window.
- **MS extension points required:** `examples/` directory + `docs/tutorials/` + repo contribution process (CLA, code review).

---

## 5. Recommended approach for the 5-day sprint

**Pick pattern D (two-layer demo) on the laptop, with pattern B (sidecar webhook) credibly architected on the slide.** Mention pattern E ("we will open a clinical-extension PR after Berlin") as the ask-slide artifact.

Rationale, honest:

- The sprint has ~5 working days, 4-5 students, and `berlin-sprint-plan.md` already locks Day 2 on the methotrexate rule end-to-end and Day 3 on the dashboard + second rule. There is **no slack** for translating rules into Rego, conforming to MS's middleware ABI, or running MS's CI. Patterns A, C, and E are not deliverable in the window.
- Pattern D ("Sentra runs alongside") is demoable in the existing architecture with zero MS-toolkit code on the laptop. The slide shows two boxes (MS = plumbing, Sentra = clinical layer); the live demo shows Sentra's existing intercept loop unchanged. The MS toolkit appears on the architecture diagram, not in the running stack. This is honest as long as the team says so on the slide: "demoed end-to-end on the Sentra layer; integration with the MS toolkit is the architected next step under pattern B."
- Pattern B (sidecar webhook) is the most defensible production story because it preserves the three-strike behavioral primitive that is Sentra's actual differentiation. Rego cannot carry session state without external storage; the MS toolkit's middleware can call out to Sentra trivially. Present this as the production path.
- Reserve a single slide for pattern E (upstream contribution intent) as concrete follow-through the Microsoft strategist can endorse, it costs nothing to promise and signals collaboration over competition.

**Do not promise on stage:** OPA Rego rule pack ready, MS toolkit running on the demo laptop, hash-chain audit log, Helm chart, .NET SDK. None of these will exist by Friday and Microsoft will know.

**What to drop into the deck from this doc:**
- The architecture table (section 1), trimmed to 4-5 rows that fit one slide.
- Section 2 verbatim as a "where Microsoft is better" slide. This is the credibility move.
- Section 3 as the "where Sentra is differentiated" slide, with the three-strike `supervisor/risk.py` snippet and the planned Article-12 audit-row schema.
- Pattern D as the demo architecture diagram + pattern B as the production architecture diagram. Two boxes either way.

Cross-link this doc from the Day-1 scope-lock entry in `berlin-sprint-plan.md` so the team has a single source of truth for the comparison framing.
