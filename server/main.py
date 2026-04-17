from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.auth.router import router as auth_router
from server.routers import (
    agents as agents_router,
    stream as stream_router,
    evaluations as evaluations_router,
    profile as profile_router,
    resume as resume_router,
    pdf as pdf_router,
)
from server.routers import tracker as tracker_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(agents_router.router)
app.include_router(stream_router.router)
app.include_router(tracker_router.router)
app.include_router(evaluations_router.router)
app.include_router(profile_router.router)
app.include_router(resume_router.router)
app.include_router(pdf_router.router)
