from langgraph.graph import END, START, StateGraph

from langraph.app.rag_state import RAGState
from langraph.nodes.answer_node import answer_node
from langraph.nodes.rerank_node import rerank_node
from langraph.nodes.retrieve_sparql_node import retrieve_sparql_node
from langraph.nodes.retrieve_vector_node import retrieve_vector_node


def build_rag_graph():
    """Build and compile the RAG query graph."""
    graph = StateGraph(RAGState)

    graph.add_node("retrieve_vector", retrieve_vector_node)
    graph.add_node("retrieve_sparql", retrieve_sparql_node)
    graph.add_node("rerank", rerank_node)
    graph.add_node("answer", answer_node)

    graph.add_edge(START, "retrieve_vector")
    graph.add_edge(START, "retrieve_sparql")
    graph.add_edge("retrieve_vector", "rerank")
    graph.add_edge("retrieve_sparql", "rerank")
    graph.add_edge("rerank", "answer")
    graph.add_edge("answer", END)

    return graph.compile()
