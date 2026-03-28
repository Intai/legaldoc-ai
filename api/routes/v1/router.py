from fastapi import APIRouter

from api.routes.v1.endpoints.documents import router as documents_router

router = APIRouter()
router.include_router(documents_router)
