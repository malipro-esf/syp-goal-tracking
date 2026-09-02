from fastapi import APIRouter

from syp.api.v1.activities import router as activities_router
from syp.api.v1.admin import router as admin_router
from syp.api.v1.ai_coach import router as ai_coach_router
from syp.api.v1.auth import router as auth_router
from syp.api.v1.coaching import router as coaching_router
from syp.api.v1.health import router as health_router
from syp.api.v1.plans import router as plans_router
from syp.api.v1.progress import router as progress_router
from syp.api.v1.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(admin_router)
api_router.include_router(ai_coach_router)
api_router.include_router(auth_router)
api_router.include_router(coaching_router)
api_router.include_router(users_router)
api_router.include_router(plans_router)
api_router.include_router(activities_router)
api_router.include_router(progress_router)
