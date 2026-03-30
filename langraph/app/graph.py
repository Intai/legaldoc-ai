from langgraph.graph import END, START, StateGraph

from langraph.app.state import GenerateDocumentState
from langraph.nodes.analyze_node import analyze_node
from langraph.nodes.draft_node import draft_node
from langraph.nodes.finalize_node import finalize_node
from langraph.nodes.structure_node import structure_node


def build_graph():
    """Build and compile the document generation graph."""
    graph = StateGraph(GenerateDocumentState)

    graph.add_node("analyze", analyze_node)
    graph.add_node("structure", structure_node)
    graph.add_node("draft", draft_node)
    graph.add_node("finalize", finalize_node)

    graph.add_edge(START, "analyze")
    graph.add_edge("analyze", "structure")
    graph.add_edge("structure", "draft")
    graph.add_edge("draft", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()
