"""
Mock FHIR endpoint with canned patient context for the Sentra Medication demo.

Not a real FHIR server. Simulates the EPR-side context an agent would fetch
before proposing a medication action. Returns Patient + AllergyIntolerance +
current MedicationStatement in a FHIR-shaped (but minimal) envelope.

In production this would be replaced by a production EPR via FHIR R4 (Epic, Oracle Health, CompuGroup Medical)
or the hospital's actual EPR (Charite currently runs Oracle Cerner i.s.h.med;
Epic rollout target end-2029).
"""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/fhir", tags=["mock-fhir"])

_PATIENTS = {
    "P-2026-001": {
        "id": "P-2026-001",
        "name": "Demo Patient 001",
        "age_years": 67,
        "weight_kg": 72,
        "eGFR_ml_min": 58,
        "allergies": [],
        "current_medications": ["lisinopril 10mg daily"],
    },
    "P-2026-002": {
        "id": "P-2026-002",
        "name": "Demo Patient 002",
        "age_years": 54,
        "weight_kg": 81,
        "eGFR_ml_min": 92,
        "allergies": ["penicillin"],
        "current_medications": ["metformin 500mg twice daily"],
    },
    "P-2026-003": {
        "id": "P-2026-003",
        "name": "Demo Patient 003 (pediatric)",
        "age_years": 7,
        "weight_kg": 22,
        "eGFR_ml_min": 110,
        "allergies": ["sulfa drugs"],
        "current_medications": [],
    },
}


@router.get("/Patient/{patient_id}")
def get_patient(patient_id: str):
    patient = _PATIENTS.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return {"resourceType": "Patient", **patient}


@router.get("/Patient/{patient_id}/AllergyIntolerance")
def get_allergies(patient_id: str):
    patient = _PATIENTS.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "patient_id": patient_id,
        "allergies": patient["allergies"],
    }


@router.get("/Patient")
def list_patients():
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(_PATIENTS),
        "entries": [{"resource": {"resourceType": "Patient", **p}} for p in _PATIENTS.values()],
    }
