import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, disconnect_db
from routes.itineraries import router as itineraries_router
from routes.activities import router as activities_router
from routes.extraction import router as extraction_router
from routes.export_import import router as export_import_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to MongoDB...")
    connect_db()
    logger.info("Connected to MongoDB")
    yield
    logger.info("Disconnecting from MongoDB...")
    disconnect_db()


app = FastAPI(
    title="Japan Itinerary Planner API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(itineraries_router)
app.include_router(activities_router)
app.include_router(extraction_router)
app.include_router(export_import_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
