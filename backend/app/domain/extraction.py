"""Provider-independent provenance, evidence and technical processing states."""

from dataclasses import dataclass
from enum import StrEnum


def validate_optional_text(value: object) -> None:
    if value is not None and not isinstance(value, str):
        raise ValueError("Expected text or null")


class ProcessingStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class ProviderExtractionError(Exception):
    """Safe, fixed provider error code; never stores raw provider response text."""

    CODES = frozenset(
        {
            "GEMINI_INPUT_TOO_LARGE",
            "GEMINI_UNSUPPORTED_MEDIA",
            "GEMINI_QUOTA",
            "GEMINI_AUTH",
            "GEMINI_PROVIDER_ERROR",
            "GEMINI_TIMEOUT",
            "GEMINI_NETWORK",
            "GEMINI_BLOCKED",
            "GEMINI_BLOCKED_OR_INCOMPLETE",
            "GEMINI_EMPTY_RESPONSE",
            "GEMINI_INVALID_RESPONSE",
        }
    )

    def __init__(self, code: str):
        self.code = code if code in self.CODES else "GEMINI_PROVIDER_ERROR"
        super().__init__(self.code)


@dataclass(frozen=True)
class SourceReference:
    field: str
    page: int | None = None
    quote: str | None = None

    def __post_init__(self):
        if not isinstance(self.field, str) or not self.field.strip():
            raise ValueError("Invalid source reference")
        if self.page is not None and (type(self.page) is not int or self.page < 1):
            raise ValueError("Invalid source page")
        validate_optional_text(self.quote)


@dataclass(frozen=True)
class ExtractionProvenance:
    provider: str = "unspecified"
    model: str | None = None
    prompt_version: str | None = None

    def __post_init__(self):
        if not isinstance(self.provider, str) or not self.provider.strip():
            raise ValueError("Invalid provenance provider")
        validate_optional_text(self.model)
        validate_optional_text(self.prompt_version)
