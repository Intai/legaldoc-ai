from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from langraph.models.finalize_llm import finalize_llm
from langraph.prompts.loader import load_prompt


class FinalizeResult(BaseModel):
    sections: list[dict]
    description: str


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

    return {"sections": result.sections, "description": result.description}
