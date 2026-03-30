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


def _import_graph_module():
    """Import app.graph with all external deps mocked."""
    fakes = _make_fake_langgraph()

    mock_analyze = MagicMock(name="analyze_node")
    mock_structure = MagicMock(name="structure_node")
    mock_draft = MagicMock(name="draft_node")
    mock_finalize = MagicMock(name="finalize_node")

    fake_analyze_mod = ModuleType("langraph.nodes.analyze_node")
    fake_analyze_mod.analyze_node = mock_analyze
    fake_structure_mod = ModuleType("langraph.nodes.structure_node")
    fake_structure_mod.structure_node = mock_structure
    fake_draft_mod = ModuleType("langraph.nodes.draft_node")
    fake_draft_mod.draft_node = mock_draft
    fake_finalize_mod = ModuleType("langraph.nodes.finalize_node")
    fake_finalize_mod.finalize_node = mock_finalize

    fake_state_mod = ModuleType("langraph.app.state")
    fake_state_mod.GenerateDocumentState = MagicMock()

    sys.modules.pop("langraph.app.graph", None)

    modules_patch = {
        "langgraph": fakes["langgraph"],
        "langgraph.graph": fakes["langgraph.graph"],
        "langgraph.graph.state": fakes["langgraph.graph.state"],
        "langraph.app.state": fake_state_mod,
        "langraph.nodes.analyze_node": fake_analyze_mod,
        "langraph.nodes.structure_node": fake_structure_mod,
        "langraph.nodes.draft_node": fake_draft_mod,
        "langraph.nodes.finalize_node": fake_finalize_mod,
    }

    with patch.dict(sys.modules, modules_patch):
        mod = importlib.import_module("langraph.app.graph")
        graph = mod.build_graph()

    return graph, fakes, {
        "analyze": mock_analyze,
        "structure": mock_structure,
        "draft": mock_draft,
        "finalize": mock_finalize,
    }


class TestBuildGraphReturnsCompiledGraph:
    def test_returns_compiled_graph_instance(self):
        graph, fakes, _ = _import_graph_module()
        assert isinstance(graph, fakes["_FakeCompiledGraph"])


class TestBuildGraphNodes:
    def test_has_analyze_node(self):
        graph, _, mocks = _import_graph_module()
        assert "analyze" in graph.nodes
        assert graph.nodes["analyze"] is mocks["analyze"]

    def test_has_structure_node(self):
        graph, _, mocks = _import_graph_module()
        assert "structure" in graph.nodes
        assert graph.nodes["structure"] is mocks["structure"]

    def test_has_draft_node(self):
        graph, _, mocks = _import_graph_module()
        assert "draft" in graph.nodes
        assert graph.nodes["draft"] is mocks["draft"]

    def test_has_finalize_node(self):
        graph, _, mocks = _import_graph_module()
        assert "finalize" in graph.nodes
        assert graph.nodes["finalize"] is mocks["finalize"]

    def test_has_exactly_four_nodes(self):
        graph, _, _ = _import_graph_module()
        assert len(graph.nodes) == 4


class TestBuildGraphEdges:
    def test_has_start_to_analyze_edge(self):
        graph, fakes, _ = _import_graph_module()
        assert (fakes["_START"], "analyze") in graph.graph.edges

    def test_has_analyze_to_structure_edge(self):
        graph, _, _ = _import_graph_module()
        assert ("analyze", "structure") in graph.graph.edges

    def test_has_structure_to_draft_edge(self):
        graph, _, _ = _import_graph_module()
        assert ("structure", "draft") in graph.graph.edges

    def test_has_draft_to_finalize_edge(self):
        graph, _, _ = _import_graph_module()
        assert ("draft", "finalize") in graph.graph.edges

    def test_has_finalize_to_end_edge(self):
        graph, fakes, _ = _import_graph_module()
        assert ("finalize", fakes["_END"]) in graph.graph.edges

    def test_has_exactly_five_edges(self):
        graph, _, _ = _import_graph_module()
        assert len(graph.graph.edges) == 5
