"""Shared Pydantic schemas for API responses."""

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Error detail in API responses.

    Attributes:
        message: Human-readable error message.
        code: Machine-readable error code.
    """

    message: str
    code: str
