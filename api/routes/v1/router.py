from fastapi import APIRouter

from api.routes.v1.endpoints.assistant import router as assistant_router
from api.routes.v1.endpoints.documents import router as documents_router
from api.routes.v1.endpoints.references import router as references_router

router = APIRouter()
router.include_router(assistant_router)
router.include_router(documents_router)
router.include_router(references_router)
