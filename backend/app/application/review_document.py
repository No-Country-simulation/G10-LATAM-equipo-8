from datetime import UTC, datetime

from app.application.ports import TriageRepository
from app.domain.review import ReviewAction, ReviewEvent, review_triage
from app.domain.triaje import Destination, Triage


class ReviewDocument:
    def __init__(self, repository: TriageRepository):
        self.repository = repository

    def execute(
        self,
        document_id: str,
        action: ReviewAction,
        reviewer: str,
        comment: str,
        destination: Destination | None,
        changes: dict[str, str | int | None],
    ) -> Triage:
        return self.repository.review(
            document_id,
            lambda triage: review_triage(
                triage,
                action,
                reviewer,
                comment,
                destination,
                changes,
                datetime.now(UTC),
            ),
        )


class GetReviews:
    def __init__(self, repository: TriageRepository):
        self.repository = repository

    def execute(self, document_id: str) -> tuple[ReviewEvent, ...]:
        return self.repository.reviews(document_id)
