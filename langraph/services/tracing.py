"""Tracing decorator for LangGraph node functions."""

import functools
from collections.abc import Callable

from opentelemetry import trace

tracer = trace.get_tracer("langraph.nodes")


def traced_node(name: str) -> Callable:
    """Decorator factory that wraps an async node function with a tracing span.

    Usage:
        @traced_node("analyze")
        async def analyze_node(state: dict) -> dict:
            ...

    The span is named ``langraph.node.{name}`` and carries attributes
    ``langraph.node.name`` and ``langraph.graph``.
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        async def wrapper(state: dict) -> dict:
            graph_name = state.get("graph", "")
            with tracer.start_as_current_span(f"langraph.node.{name}") as span:
                span.set_attribute("langraph.node.name", name)
                span.set_attribute("langraph.graph", graph_name)
                return await fn(state)

        return wrapper

    return decorator
