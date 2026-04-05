from langgraph.graph import END, START, StateGraph

from langraph.app.rag_state import RAGState
from langraph.nodes.answer_node import answer_node
from langraph.nodes.rerank_node import rerank_node
from langraph.nodes.retrieve_node import retrieve_node


def build_rag_graph():
    """Build and compile the RAG query graph."""
    graph = StateGraph(RAGState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("rerank", rerank_node)
    graph.add_node("answer", answer_node)

    graph.add_edge(START, "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_edge("rerank", "answer")
    graph.add_edge("answer", END)

    return graph.compile()
