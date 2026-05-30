# Demo Narration Script

Verbatim lines for whoever drives the laptop during the live demo (Slide 6 of the deck).

Total target time: 90 seconds. Rehearse twice on Monday on the actual presentation hardware.

---

## Pre-demo setup (do this BEFORE the talk starts)

1. Open three terminals in your terminal app:
   - **Terminal A:** `cd ~/sentra-medication && .venv/bin/uvicorn supervisor.main:app --host 127.0.0.1 --port 8000`
   - **Terminal B:** `cd ~/sentra-medication` (ready, no command yet)
   - **Terminal C:** `cd ~/sentra-medication && .venv/bin/streamlit run dashboard/app.py --server.headless false`
2. Confirm the dashboard opens in the browser at `http://localhost:8501`.
3. Reset state: in Terminal B, run `curl -X POST http://127.0.0.1:8000/reset` (gives you a clean event log).
4. Position windows: browser (dashboard) on the left half of the screen, Terminal B on the right half.
5. Refresh the dashboard once. Confirm the live event stream is empty.

You're ready when the audience sees an empty Sentra dashboard with the green brand strip and the "Sentra · Medication Governance" title.

---

## Narration (90 seconds, paired with on-screen actions)

> **[0:00] Speaker:** "What you're looking at is Sentra running on my laptop. The supervisor is the FastAPI service in Terminal A. The dashboard you see in the browser is reading the audit log live. Right now it's empty. We're going to send a real medication action through and watch what happens."

> **[0:10] Speaker:** "I'm playing the role of a clinical AI agent. The kind Microsoft's Healthcare Agent Service is enabling, or one built on the Microsoft Agent Framework. The agent has just been asked to start methotrexate for a 67-year-old patient. Methotrexate, as a reminder, is correctly dosed weekly. Daily is the canonical LLM hallucination ECRI flagged. Let's see what happens when the agent tries to send the daily order."

> **[0:25] Action:** In Terminal B, run:
> ```bash
> .venv/bin/python demo/methotrexate_scenario.py
> ```

> **[0:30] Speaker (while output streams):** "The agent proposed methotrexate 25mg daily. Sentra intercepted pre-execution. Watch the dashboard."

> **[0:40] Action:** Click over to the browser. The audit row should appear within 2 seconds.

> **[0:42] Speaker (clicking the new audit row's inspect button):** "Here's the first audit entry. Decision: blocked. Policy that fired: BLOCK_METHOTREXATE_FREQUENCY_MISMATCH. Reason in plain language: methotrexate at daily frequency is contraindicated, correct schedule is weekly, sustained daily administration causes severe toxicity. Citation: ECRI 2025-2026 Top 10 Health Tech Hazards. Article 14(4)(d) interrupt triggered. And these fields here, rule_id, rule_version, policy_hash, inputs_sha256, citation, those are the Article-12 audit fields. Every event row carries them, automatically."

> **[1:00] Speaker:** "The agent tried again. Same prescription. Same block. Strike counter is now at two. And the third attempt..."

> **[1:08] Action:** Scroll the audit log to show the third entry, which is `Agent Shut Down`.

> **[1:12] Speaker:** "Third strike. The agent's status is now Agent Shut Down. This is the stateful behavioral primitive I mentioned on the previous slide. Sentra isn't asking 'is this call allowed,' it's asking 'is this agent still trustworthy in this session.' Three blocked attempts and the agent is removed from the encounter."

> **[1:25] Speaker:** "Last thing. The agent retried with a completely safe prescription, amoxicillin every eight hours, routine. Watch."

> **[1:30] Action:** Show the fourth audit row, still showing `Agent Shut Down` decision.

> **[1:32] Speaker:** "Still denied. Once the agent is in shut-down state, every subsequent action is denied regardless of content. That prevents a drifting agent from doing damage by accident on the way out. That's the 90-second demo. Three medication actions, one safe one, all four governed by the same engine. Two distinct rules, one stateful primitive, one Article-12 audit substrate."

> **[1:45]** Switch back to the deck. Go to Slide 7 (regulatory framing).

---

## What to do if something goes wrong

### If the supervisor isn't responding
- Symptom: the demo script prints "Sentra supervisor is not reachable."
- Action: Switch to backup recording (see below). Don't try to debug live.

### If the dashboard doesn't refresh
- Symptom: you ran the demo, the terminal shows blocks, but the dashboard is still empty.
- Action: Click the browser tab once to give it focus. The Streamlit fragment refreshes every 2 seconds. If still empty, manually reload the page.

### If the demo script hangs
- Symptom: Terminal B is spinning, no output for >10 seconds.
- Action: Ctrl+C. Show the backup recording.

### Backup recording
- Recorded Monday evening, saved at `~/sentra-medication/demo/backup.mov` (TODO: actually record this).
- Open with QuickTime, full-screen.
- Narrate the same script over the recording. Audience won't notice the swap if you don't.

---

## Speaker positioning

- Stand on the LEFT of the screen so the audience sees the dashboard clearly when you gesture at it.
- Don't read the audit row word-for-word; point and summarize.
- The "Article 14(4)(d) interrupt triggered" line in the event trace is your bridge into Slide 7. Land it visibly.

---

## What the audience should walk away believing

1. Sentra is real working code, not a slide-ware mockup. They saw it run live.
2. The block decision was deterministic, traceable, and citation-bearing.
3. The three-strike shutdown is a meaningfully different behavior than the Microsoft toolkit's stateless allow/deny.
4. The Article-12 audit row would survive a German regulator's first 10 minutes of cross-examination.

If you land all four, the rest of the pitch is downhill.
