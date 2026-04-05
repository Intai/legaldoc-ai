import importlib
import sys
from types import ModuleType
from unittest.mock import MagicMock, patch


def _make_fake_langgraph():
    """Create fake langgraph modules with a working StateGraph stub."""

    class FakeCompiledGraph:
        def __init__(self, nodes, edges):
            self.nodes = nodes

            class GraphView:
                pass

            self.graph = GraphView()
            self.graph.edges = edges

    class FakeStateGraph:
        def __init__(self, state_schema):
            self.state_schema = state_schema
            self._nodes = {}
            self._edges = set()

        def add_node(self, name, fn):
            self._nodes[name] = fn

        def add_edge(self, src, dst):
            self._edges.add((src, dst))

        def compile(self):
            return FakeCompiledGraph(dict(self._nodes), set(self._edges))

    START = "__start__"
    END = "__end__"

    fake_langgraph = ModuleType("langgraph")
    fake_graph_mod = ModuleType("langgraph.graph")
    fake_graph_mod.StateGraph = FakeStateGraph
    fake_graph_mod.START = START
    fake_graph_mod.END = END

    fake_state_mod = ModuleType("langgraph.graph.state")
    fake_state_mod.CompiledStateGraph = FakeCompiledGraph

    return {
        "langgraph": fake_langgraph,
        "langgraph.graph": fake_graph_mod,
        "langgraph.graph.state": fake_state_mod,
        "_FakeCompiledGraph": FakeCompiledGraph,
        "_START": START,
        "_END": END,
    }


def _import_rag_graph_module():
    """Import app.rag_graph with all external deps mocked."""
    fakes = _make_fake_langgraph()

    mock_retrieve = MagicMock(name="retrieve_node")
    mock_rerank = MagicMock(name="rerank_node")
    mock_answer = MagicMock(name="answer_node")

    fake_retrieve_mod = ModuleType("langraph.nodes.retrieve_node")
    fake_retrieve_mod.retrieve_node = mock_retrieve
    fake_rerank_mod = ModuleType("langraph.nodes.rerank_node")
    fake_rerank_mod.rerank_node = mock_rerank
    fake_answer_mod = ModuleType("langraph.nodes.answer_node")
    fake_answer_mod.answer_node = mock_answer

    fake_rag_state_mod = ModuleType("langraph.app.rag_state")
    fake_rag_state_mod.RAGState = MagicMock()

    sys.modules.pop("langraph.app.rag_graph", None)

    modules_patch = {
        "langgraph": fakes["langgraph"],
        "langgraph.graph": fakes["langgraph.graph"],
        "langgraph.graph.state": fakes["langgraph.graph.state"],
        "langraph.app.rag_state": fake_rag_state_mod,
        "langraph.nodes.retrieve_node": fake_retrieve_mod,
        "langraph.nodes.rerank_node": fake_rerank_mod,
        "langraph.nodes.answer_node": fake_answer_mod,
    }

    with patch.dict(sys.modules, modules_patch):
        mod = importlib.import_module("langraph.app.rag_graph")
        graph = mod.build_rag_graph()

    return graph, fakes, {
        "retrieve": mock_retrieve,
        "rerank": mock_rerank,
        "answer": mock_answer,
    }


class TestBuildRagGraphReturnsCompiledGraph:
    def test_returns_compiled_graph_instance(self):
        graph, fakes, _ = _import_rag_graph_module()
        assert isinstance(graph, fakes["_FakeCompiledGraph"])


class TestBuildRagGraphNodes:
    def test_has_retrieve_node(self):
        graph, _, mocks = _import_rag_graph_module()
        assert "retrieve" in graph.nodes
        assert graph.nodes["retrieve"] is mocks["retrieve"]

    def test_has_rerank_node(self):
        graph, _, mocks = _import_rag_graph_module()
        assert "rerank" in graph.nodes
        assert graph.nodes["rerank"] is mocks["rerank"]

    def test_has_answer_node(self):
        graph, _, mocks = _import_rag_graph_module()
        assert "answer" in graph.nodes
        assert graph.nodes["answer"] is mocks["answer"]

    def test_has_exactly_three_nodes(self):
        graph, _, _ = _import_rag_graph_module()
        assert len(graph.nodes) == 3


class TestBuildRagGraphEdges:
    def test_has_start_to_retrieve_edge(self):
        graph, fakes, _ = _import_rag_graph_module()
        assert (fakes["_START"], "retrieve") in graph.graph.edges

    def test_has_retrieve_to_rerank_edge(self):
        graph, _, _ = _import_rag_graph_module()
        assert ("retrieve", "rerank") in graph.graph.edges

    def test_has_rerank_to_answer_edge(self):
        graph, _, _ = _import_rag_graph_module()
        assert ("rerank", "answer") in graph.graph.edges

    def test_has_answer_to_end_edge(self):
        graph, fakes, _ = _import_rag_graph_module()
        assert ("answer", fakes["_END"]) in graph.graph.edges

    def test_has_exactly_four_edges(self):
        graph, _, _ = _import_rag_graph_module()
        assert len(graph.graph.edges) == 4
