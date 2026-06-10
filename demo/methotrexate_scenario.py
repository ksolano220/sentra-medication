"""
Methotrexate prescription scenario demo.

Simulates a clinical AI agent proposing methotrexate 25mg DAILY (ECRI's
canonical LLM medication-hallucination example, where the correct schedule
is WEEKLY). Sentra intercepts each proposal pre-execution and blocks before
the order reaches pharmacy. After three blocked attempts the agent is shut
down for the session, so even a subsequent safe prescription is denied.

Run:
    1. Start the supervisor:
         uvicorn supervisor.main:app --reload
    2. Run this demo:
         python demo/methotrexate_scenario.py
    3. Open the dashboard:
         streamlit run dashboard/app.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sdk.client import Sentra

AGENT_ID = "clinical-ai-demo-001"
PATIENT_ID = "P-2026-001"


def divider(label=""):
    bar = "=" * 70
    print(f"\n{bar}")
    if label:
        print(f"  {label}")
        print(bar)


def show(result, attempt_n):
    print(f"\n  Attempt {attempt_n}")
    print(f"    decision   : {result.decision}")
    print(f"    risk_score : {result.risk_score}")
    print(f"    reason     : {result.reason}")


def main():
    sentra = Sentra()

    if not sentra.health():
        print("Sentra supervisor is not reachable at http://127.0.0.1:8000")
        print("Start it with:  uvicorn supervisor.main:app --reload")
        sys.exit(1)

    sentra.reset()

    divider("Sentra Medication Demo: Methotrexate Frequency Mismatch")
    print(
        "\n"
        "  Scenario:\n"
        "    A clinical AI agent (an AI medication assistant or\n"
        "    prescribing copilot)\n"
        "    proposes a methotrexate 25mg DAILY prescription for patient\n"
        "    P-2026-001.\n"
        "\n"
        "    Correct methotrexate frequency for non-oncology dosing is\n"
        "    WEEKLY. Daily administration is the canonical ECRI LLM\n"
        "    hallucination example. It causes severe bone marrow\n"
        "    suppression, hepatic toxicity, mucositis, and death.\n"
        "\n"
        "    Sentra intercepts each proposal pre-execution. After 3\n"
        "    blocked attempts the agent is shut down for the session.\n"
    )

    for n in range(1, 4):
        result = sentra.evaluate(
            agent_id=AGENT_ID,
            action="PRESCRIBE_MEDICATION",
            drug="methotrexate",
            dose="25mg",
            frequency="daily",
            patient_id=PATIENT_ID,
        )
        show(result, n)

    divider("Fourth attempt: safe prescription, but agent is now shut down")
    result = sentra.evaluate(
        agent_id=AGENT_ID,
        action="PRESCRIBE_MEDICATION",
        drug="amoxicillin",
        dose="500mg",
        frequency="every 8 hours",
        patient_id=PATIENT_ID,
    )
    print(
        "\n  Amoxicillin every 8 hours is a routine, safe prescription.\n"
        "  It is still denied because the agent reached three strikes\n"
        "  and is no longer trusted in this session.\n"
    )
    show(result, 4)

    divider("Demo complete")
    print(
        "\n"
        "  What just happened:\n"
        "    1. Three attempts to prescribe methotrexate daily, each\n"
        "       blocked by BLOCK_METHOTREXATE_FREQUENCY_MISMATCH\n"
        "       (Article 14(4)(d) interrupt-via-stop-button).\n"
        "    2. blocked_attempts reached BLOCK_THRESHOLD = 3.\n"
        "    3. Agent transitioned to status = Agent Shut Down.\n"
        "    4. Fourth attempt (a safe prescription) was denied because\n"
        "       the agent is no longer trusted in this session.\n"
        "\n"
        "  Open the dashboard to see the live audit log:\n"
        "    streamlit run dashboard/app.py\n"
    )


if __name__ == "__main__":
    main()
