# Google Pitch Reframe

Research output. Read alongside [berlin-sprint-plan.md](./berlin-sprint-plan.md) and [pitch-deck.md](./pitch-deck.md). All facts verified against sources dated 2024-2026.

## Headline reframe

**"Google built the agent runtime. Sentra fills in the prescriber."**

Sentra is the clinical content + behavioral-risk layer that sits on top of Vertex AI Agent Builder and Cloud Healthcare API. Google ships the FHIR store, the Gemini-class medical models (MedGemma, Med-PaLM 2 lineage), and the agent runtime governance (Agent Gateway, Model Armor, ADK plugins). Sentra ships the medication-rule pack and the per-agent three-strike escalation Google does not ship and is explicitly out of scope for the Vertex platform team.

## Product map (Microsoft → Google)

| Role in pitch | Microsoft (original) | Google (replacement) |
|---|---|---|
| Clinical AI assistant for doctors | Dragon Copilot | **MedGemma 4B/27B** (open-weight, May 2025 I/O) + Med-PaLM 2 lineage via Vertex AI |
| Agent runtime governance | MS Agent Governance Toolkit | **Vertex AI Agent Builder + Agent Gateway + Model Armor + ADK callbacks** |
| FHIR / clinical data spine | Azure Health Data Services | **Cloud Healthcare API** |
| Agent SDK | MS Agent Framework / Semantic Kernel | **Google ADK** (Python + Java) + MCP Toolbox |
| AI safety / content filter | Azure AI Content Safety | **Model Armor** |
| European reference hospital | Charité on Dragon Copilot | **UKSH** + **Freiburg** on T-Systems Sovereign Cloud powered by Google Cloud + **Bayer** radiology on Vertex AI |
| Acquisition precedent | Nuance, $19.7B, 2021 | **No Nuance equivalent.** Google's pattern is partnership-led: Mayo, Ascension, HCA, Bayer, Apollo |
| Startup credit program | MS for Startups Founders Hub | **Google for Startups Cloud Program** (up to $200k credits, $350k AI-first, $250k Year 1 for Gemini-built apps) |

## Opener (replaces Charité / Dragon Copilot)

> "In January 2024, University Hospital Schleswig-Holstein — Germany's second-largest university hospital — chose T-Systems Sovereign Cloud powered by Google Cloud as the foundation for its clinical data and AI. Freiburg followed. Bayer's radiology AI platform went live on Vertex AI + Cloud Healthcare API in April 2024. Google now has the data plane and the agent runtime running in German university hospitals. What is **not** in that stack is a deterministic medication-safety layer with cumulative agent risk and an Article-12-shaped audit row. That layer is what we built."

**Backup hook:**
> "Google released MedGemma at I/O 2025 as open-weight medical foundation models, explicitly labeled as research and development tools, not for direct clinical deployment. The clinical guardrail layer that turns a research model into a deployer-grade workflow is what Sentra is."

## Reference customers (use these, NOT Charité)

| Customer | Source | Notes |
|---|---|---|
| **UKSH (Kiel/Lübeck)** | T-Systems Sovereign Cloud powered by Google Cloud, Jan 2024, MRI/tumor + routine-work | Germany's #2 university hospital |
| **Univ. Freiburg** | Same stack, genomics + Gemini | Confirmed |
| **Bayer (radiology)** | April 2024: Vertex AI + BigQuery + Cloud Healthcare API + Chronicle | German MNC on exact Sentra-relevant stack |
| **HCA / Apollo 24/7** | MedLM pilots | Non-EU, background only |
| **Charité** | NOT a Google customer | **Do not claim** |

## M&A / partnership story (replaces Nuance)

> "Microsoft bought clinical AI for $19.7B (Nuance, 2021). Google's pattern is different: DeepMind 2014, Fitbit $2.1B 2021 for consumer signal, Verily kept as Alphabet spinout. Clinical AI delivered via partnership — Mayo, Ascension, HCA, Bayer, Apollo. **Google does not buy clinical content; Google partners for it. That is the gap Sentra is built to fill: a clinical-content layer Google can partner with, rather than acquire.**"

**This is a stronger pitch shape than the Microsoft version** — Sentra fits Google's known M&A behavior instead of asking Google to repeat Nuance.

## Integration architecture (replaces Pattern B / AGT PDP)

Google does not publish a single "PDP decision contract v1.0" the way MS AGT does. Equivalent extension surfaces:

1. **ADK plugins / callbacks** (`google/adk-python`) — `before_tool_callback` hook returning a value short-circuits agent execution. In-process interception seam.
2. **Agent Gateway** — central policy enforcement point in Vertex AI Agent Builder (Cloud Next 2026).
3. **Model Armor REST API** — multi-LLM runtime filter (prompt injection, jailbreak, DLP, topicality).
4. **MCP Toolbox** — Google's open MCP wrapper for Cloud Healthcare API. Sentra can expose `evaluate_action` as an MCP server.

**Pattern G-B (sidecar via ADK callback):** Keep Sentra's FastAPI supervisor + `risk.py` three-strike intact. Thin ADK plugin forwards `before_tool_callback` payload to `POST /agent-action`, parses decision, returns to ADK runtime. Sentra = external PDP; Agent Gateway + Model Armor remain as generic plumbing.

**Pattern G-MCP (Sentra as MCP server):** Expose `evaluate_action` as an MCP tool. Any Gemini Enterprise / Vertex Agent / ADK agent that loads the server gets clinical evaluation as a tool call. Cleanest "drop-in" framing for a Google PM audience because MCP is now the cross-runtime standard Google promotes.

Both preserve cumulative risk + three-strike — Agent Gateway is per-call and Model Armor is per-prompt; neither carries session state.

## What's STRONGER about Google vs Microsoft

1. **MedGemma's own model card concedes the gap.** "Not for direct clinical deployment" is hand-delivered to Sentra. MS pitch had to manufacture this; Google docs concede it.
2. **M&A pattern fits Sentra as partner, not acquirer** — more credible ask.
3. **Open-weight + open-source cultural fit** (MedGemma open-weight, ADK on GitHub, MCP open, Sentra MIT).
4. **German sovereign-cloud anchor is fresher and German** (UKSH + Freiburg + Bayer + Munich sovereign hub Nov 2025).
5. **Cloud Healthcare API + FHIR more mature**, with more partner-side tooling (MCP Toolbox, ADK samples). Sentra's mock FHIR maps cleanly.
6. **Gemini Enterprise Agent Platform rebrand = offensive posture.** PMs are actively shopping for ISV layers.

## What's WEAKER about Google vs Microsoft

1. **No Charité analogue.** UKSH/Freiburg are real but less famous.
2. **No clean "Toolkit v1.0" to position against.** Google's equivalent is spread across four products under the Gemini Enterprise Agent Platform umbrella.
3. **No Nuance-scale acquisition anchor.**
4. **MedGemma is dev tool not clinical product.** Helps the gap argument; hurts the "rides on the doctor's existing AI" framing.
5. **More US-heavy customer base** — HCA, Mayo, Ascension. Berlin room may discount.
6. **Vertex governance moving fast.** Agent Gateway / Model Armor / Agent Identity all shipping 2025-2026. Moat narrower in time.

## Verbatim copy changes

| # | Microsoft (original) | Google (replacement) |
|---|---|---|
| 1 | "Charité is a Microsoft Dragon Copilot launch customer since March 2025." | "UKSH, Germany's second-largest university hospital, has been on T-Systems Sovereign Cloud powered by Google Cloud since January 2024. Freiburg followed. Bayer's radiology AI platform runs on Vertex AI + Cloud Healthcare API since April 2024." |
| 2 | "Microsoft paid $19.7B for Nuance because clinical AI is strategic." | "Google's pattern in clinical AI is partnership, not acquisition: Mayo, Ascension, HCA, Bayer, Apollo. We are not asking Google to acquire clinical content. We are asking to be the medication-rule pack on top of MedGemma and Vertex Agent Builder." |
| 3 | "MS AGT v1.0 (April 2 2026) ships the plumbing. Sentra ships the clinic." | "Vertex AI Agent Builder ships Agent Gateway, Model Armor, Agent Identity, ADK callbacks: the runtime plumbing. Sentra ships the medication-rule pack, the cumulative-risk model, and the Article-12-shaped audit row the platform team has not built." |
| 4 | "Sentra plugs into MS toolkit's `GovernancePolicyMiddleware` as an external PDP." | "Sentra plugs into the ADK `before_tool_callback` as an external PDP, or exposes `evaluate_action` as an MCP server that any Gemini Enterprise / Vertex Agent / ADK agent can load." |
| 5 | "MS AGT's policy DSL is YAML + Rego + Cedar; Sentra's value is clinical content on top." | "Vertex's policy surface is split across Agent Gateway policies, Model Armor templates, and ADK plugin hooks; Sentra's value is the clinical content that loads through any of those seams." |
| 6 | "Dragon Copilot generates the note; Sentra checks whether the medication action is safe." | "MedGemma reasons over the clinical text and images; Sentra checks whether the medication action MedGemma proposes is safe to execute, and shuts the agent down after three strikes." |

## Sources

- MedGemma model card ("not for direct clinical deployment"): https://developers.google.com/health-ai-developer-foundations/medgemma/model-card-v1
- MedLM deprecation (Sept 29 2025): https://docs.cloud.google.com/vertex-ai/generative-ai/docs/medlm/medlm-prompts
- Vertex AI Agent Builder governance (Agent Gateway + Agent Identity): https://cloud.google.com/blog/products/ai-machine-learning/new-enhanced-tool-governance-in-vertex-ai-agent-builder
- Gemini Enterprise Agent Platform rebrand: https://docs.cloud.google.com/agent-builder/release-notes
- Model Armor: https://cloud.google.com/security/products/model-armor
- ADK plugins + callbacks: https://google.github.io/adk-docs/plugins/ and https://google.github.io/adk-docs/callbacks/
- UKSH on T-Systems + Google Cloud (Jan 2024): https://www.telekom.com/en/media/media-information/archive/university-hospital-cloud-solutions-telekom-and-google-cloud-1057030
- Univ. Freiburg: https://www.kma-online.de/aktuelles/it-digital-health/detail/universitaetsklinikum-freiburg-setzt-auf-telekom-und-google-cloud-52508
- Bayer + Google Cloud radiology (April 2024): https://www.bayer.com/media/en-us/bayer-and-google-cloud-to-accelerate-development-of-ai-powered-healthcare-applications-for-radiologists/
- Google for Startups Cloud Program ($200k / $350k AI-first / $250k Year 1 Gemini): https://cloud.google.com/startup/apply
- Google for Startups Healthcare track: https://health.google/startups-guide/
- Google Berlin office: https://blog.google/intl/de-de/unternehmen/inside-google/sundar-pichai-eroeffnet-berliner-google-buero/
