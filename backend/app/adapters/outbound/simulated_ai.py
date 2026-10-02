from app.domain.triaje import Extraction, Priority

# Exact synthetic inputs; this adapter does not interpret clinical documents.
ROUTINE = "CASO SINTETICO RUTINA: Paciente Ana Demo, 30 anos. Informe de laboratorio."
URGENT = "CASO SINTETICO URGENTE: Paciente Luis Demo, 52 anos. Informe de imagen urgente."
AMBIGUOUS = "CASO SINTETICO AMBIGUO: Receta con nombre y matricula ilegibles."


class SimulatedExtractor:
    def extract(self, content: bytes, media_type: str) -> Extraction:
        if media_type != "text/plain":
            return Extraction(
                "No determinado", Priority.ROUTINE, 0.0, audit_reasons=("AI_UNAVAILABLE",)
            )
        text = content.decode("utf-8").strip()
        if text == ROUTINE:
            return Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.95, "Ana Demo", 30)
        if text == URGENT:
            return Extraction("Informe de Imagenes", Priority.URGENT, 0.95, "Luis Demo", 52)
        if text == AMBIGUOUS:
            return Extraction(
                "Receta Medica",
                Priority.ROUTINE,
                0.2,
                audit_reasons=("MISSING_CRITICAL_FIELDS", "LOW_CONFIDENCE"),
            )
        return Extraction(
            "No determinado", Priority.ROUTINE, 0.0, audit_reasons=("AI_UNAVAILABLE",)
        )
