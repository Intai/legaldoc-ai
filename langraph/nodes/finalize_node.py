from typing import Literal

from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from langraph.models.finalize_llm import finalize_llm
from langraph.prompts.loader import load_prompt
from langraph.services.tracing import traced_node


class ContentBlock(BaseModel):
    type: Literal["paragraph", "bold", "italic", "list"]
    text: str | None = None
    items: list[str] | None = None


class Section(BaseModel):
    heading: str
    content: list[ContentBlock]


class FinalizeResult(BaseModel):
    sections: list[Section]
    description: str


@traced_node("finalize")
async def finalize_node(state: dict) -> dict:
    """Finalize the draft into structured sections with a brief description."""
    phase_callback = state.get("phase_callback")
    if phase_callback:
        await phase_callback.put("finalizing")

    prompt_text = load_prompt("finalize")

    content: list[dict] = [
        {"type": "text", "text": prompt_text},
        {"type": "text", "text": state["draft"]},
        {"type": "text", "text": state["title"]},
    ]

    message = HumanMessage(content=content)

    structured_llm = finalize_llm.with_structured_output(FinalizeResult)
    result = await structured_llm.ainvoke([message])

    sections = [s.model_dump(exclude_none=True) for s in result.sections]
    if phase_callback:
        await phase_callback.put(
            (
                "ready",
                {
                    "title": state["title"],
                    "sections": sections,
                    "doc_type": state["doc_type"],
                    "description": result.description,
                },
            )
        )

    return {"sections": sections, "description": result.description}
