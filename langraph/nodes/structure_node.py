from langchain_core.messages import HumanMessage

from langraph.models.structure_llm import structure_llm
from langraph.prompts.loader import load_prompt


async def structure_node(state: dict) -> dict:
    """Generate a document outline from the analysis and context."""
    phase_callback = state.get("phase_callback")
    if phase_callback:
        await phase_callback.put("structuring")

    prompt = load_prompt("structure")

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "text", "text": state["analysis"]},
            {"type": "text", "text": state["context"]},
        ]
    )

    response = await structure_llm.ainvoke([message])
    result = response.content

    return {"outline": result}
