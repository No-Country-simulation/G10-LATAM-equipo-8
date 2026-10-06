"""Stateless graph per ingestion; durable human review remains outside the graph."""

from dataclasses import replace
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langsmith import tracing_context

from app.application.ports import Extractor
from app.domain.triaje import Extraction


class PipelineState(TypedDict):
    content: bytes
    media_type: str
    extraction: Extraction
    trace: list[str]


class TriagePipeline:
    def __init__(self, extractor: Extractor):
        self.extractor = extractor
        self.provenance = getattr(extractor, "provenance", None)
        graph = StateGraph(PipelineState)
        graph.add_node("extract", self._extract)
        graph.add_node("validate", self._validate)
        graph.add_node("review_policy", self._policy)
        graph.add_edge(START, "extract")
        graph.add_edge("extract", "validate")
        graph.add_edge("validate", "review_policy")
        graph.add_edge("review_policy", END)
        self.graph = graph.compile(checkpointer=None)

    def _extract(self, state):
        return {
            "extraction": self.extractor.extract(state["content"], state["media_type"]),
            "trace": state["trace"] + ["extract"],
        }

    def _validate(self, state):
        if not isinstance(state["extraction"], Extraction):
            raise TypeError("Extraction domain contract required")
        return {"trace": state["trace"] + ["validate"]}

    def _policy(self, state):
        extraction = state["extraction"]
        if getattr(self.extractor, "requires_human_review", False):
            extraction = replace(
                extraction,
                audit_reasons=tuple(
                    dict.fromkeys((*extraction.audit_reasons, "GEMINI_REQUIRES_HUMAN_REVIEW"))
                ),
            )
        return {"extraction": extraction, "trace": state["trace"] + ["review_policy"]}

    def run(self, content: bytes, media_type: str):
        # Prevent ambient LangSmith tracing from exporting document content.
        with tracing_context(enabled=False):
            return self.graph.invoke(
                {"content": content, "media_type": media_type, "trace": []},
                config={"callbacks": [], "recursion_limit": 8},
            )

    def extract(self, content: bytes, media_type: str) -> Extraction:
        return self.run(content, media_type)["extraction"]

    def close(self):
        close = getattr(self.extractor, "close", None)
        if close:
            close()
