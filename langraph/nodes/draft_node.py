from langchain_core.messages import HumanMessage

from langraph.models.draft_llm import draft_llm
from langraph.prompts.loader import load_prompt
from langraph.services.tracing import traced_node


@traced_node("draft")
async def draft_node(state: dict) -> dict:
    """Draft a legal document from the outline and analysis."""
    phase_callback = state.get("phase_callback")
    if phase_callback:
        await phase_callback.put("drafting")

    prompt = load_prompt("draft")

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "text", "text": state["outline"]},
            {"type": "text", "text": state["analysis"]},
        ]
    )

    response = await draft_llm.ainvoke([message])
    result = response.content

    return {"draft": result}
