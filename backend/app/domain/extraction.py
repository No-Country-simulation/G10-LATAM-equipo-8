"""Provider-independent provenance, evidence and technical processing states."""

from dataclasses import dataclass
from enum import StrEnum


class ProcessingStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


@dataclass(frozen=True)
class SourceReference:
    field: str
    page: int | None = None
    quote: str | None = None

    def __post_init__(self):
        if not self.field or (self.page is not None and self.page < 1):
            raise ValueError("Invalid source reference")


@dataclass(frozen=True)
class ExtractionProvenance:
    provider: str = "unspecified"
    model: str | None = None
    prompt_version: str | None = None
