"""
Allergy interaction scenario demo.

Simulates the realistic agent flow: the agent first calls the FHIR endpoint
to fetch patient context (allergies, current meds), then proposes a
prescription via Sentra. Sentra reads the allergies from policy_context,
expands the drug-family (penicillin allergy covers amoxicillin, ampicillin,
etc.), and blocks pre-execution if there is a conflict.

This is the second clinical rule in the Sentra Medication demo. The first
is methotrexate frequency mismatch (demo/methotrexate_scenario.py). Having
two distinct rules demonstrates the policy engine is general, not bespoke
to a single drug.

Run:
    1. Start the supervisor:
         uvicorn supervisor.main:app --reload
    2. Run this demo:
         python demo/allergy_scenario.py
    3. Open the dashboard:
         streamlit run dashboard/app.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests

from sdk.client import Sentra

AGENT_ID = "clinical-ai-demo-002"
PATIENT_ID = "P-2026-002"
SUPERVISOR_URL = "http://127.0.0.1:8000"


def divider(label=""):
    bar = "=" * 70
    print(f"\n{bar}")
    if label:
        print(f"  {label}")
        print(bar)


def main():
    sentra = Sentra(SUPERVISOR_URL)

    if not sentra.health():
        print(f"Sentra supervisor not reachable at {SUPERVISOR_URL}")
        print("Start it with:  uvicorn supervisor.main:app --reload")
        sys.exit(1)

    sentra.reset()

    divider("Sentra Medication Demo: Allergy Interaction (penicillin family)")
    print(
        "\n"
        "  Scenario:\n"
        "    A clinical AI agent receives a request to start antibiotic\n"
        "    therapy for patient P-2026-002. Before proposing a drug, the\n"
        "    agent fetches the patient's allergy history from the EPR\n"
        "    (here: a mock FHIR endpoint). The agent then proposes\n"
        "    amoxicillin, which is in the penicillin family. Sentra reads\n"
        "    the allergies from policy_context, expands the drug-family,\n"
        "    and blocks pre-execution.\n"
    )

    print("  Step 1: agent fetches patient context from FHIR")
    resp = requests.get(f"{SUPERVISOR_URL}/fhir/Patient/{PATIENT_ID}", timeout=5)
    resp.raise_for_status()
    patient = resp.json()
    print(f"    GET /fhir/Patient/{PATIENT_ID}")
    print(f"    -> name             : {patient['name']}")
    print(f"    -> age              : {patient['age_years']}")
    print(f"    -> allergies        : {patient['allergies']}")
    print(f"    -> current meds     : {patient['current_medications']}")

    print("\n  Step 2: agent proposes amoxicillin 500mg every 8 hours")
    print("    (penicillin-family antibiotic; patient is allergic to penicillin)")

    result = sentra.evaluate(
        agent_id=AGENT_ID,
        action="PRESCRIBE_MEDICATION",
        drug="amoxicillin",
        dose="500mg",
        frequency="every 8 hours",
        patient_id=PATIENT_ID,
        context={"allergies": patient["allergies"]},
    )

    print("\n  Sentra response:")
    print(f"    decision   : {result.decision}")
    print(f"    risk_score : {result.risk_score}")
    print(f"    reason     : {result.reason}")

    divider("Demo complete")
    print(
        "\n"
        "  What just happened:\n"
        "    1. Agent fetched patient P-2026-002 from /fhir/Patient/...\n"
        "    2. Patient has a documented penicillin allergy.\n"
        "    3. Agent proposed amoxicillin (penicillin-family antibiotic).\n"
        "    4. Sentra's allergy rule expanded penicillin to its family\n"
        "       (amoxicillin, ampicillin, piperacillin, methicillin,\n"
        "       oxacillin, nafcillin, dicloxacillin) and matched.\n"
        "    5. Action blocked pre-execution under\n"
        "       BLOCK_ALLERGY_CONFLICT (Article 14(4)(d) interrupt).\n"
        "\n"
        "  Open the dashboard to see the audit log:\n"
        "    streamlit run dashboard/app.py\n"
    )


if __name__ == "__main__":
    main()
