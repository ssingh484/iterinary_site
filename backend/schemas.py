from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Activity Schemas ---
class ActivityCreate(BaseModel):
    name: str = Field(..., max_length=200)
    location: str = Field("", max_length=300)
    duration_minutes: int = Field(60, ge=5, le=1440)
    description: str = ""
    activity_order: int = 0
    best_time: str = Field("any", pattern="^(morning|afternoon|evening|any)$")


class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=300)
    duration_minutes: Optional[int] = Field(None, ge=5, le=1440)
    description: Optional[str] = None
    activity_order: Optional[int] = None
    best_time: Optional[str] = Field(None, pattern="^(morning|afternoon|evening|any)$")


class ActivityResponse(BaseModel):
    id: str
    name: str
    location: str
    duration_minutes: int
    description: str
    activity_order: int
    best_time: str
    created_at: datetime


# --- Day Schemas ---
class DayCreate(BaseModel):
    date: Optional[datetime] = None
    day_number: int = Field(..., ge=1)


class DayResponse(BaseModel):
    id: str
    date: Optional[datetime]
    day_number: int
    activities: list[ActivityResponse]


# --- Itinerary Schemas ---
class ItineraryCreate(BaseModel):
    title: str = Field(..., max_length=200)
    destination: str = Field("Japan", max_length=200)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ItineraryUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    destination: Optional[str] = Field(None, max_length=200)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ItineraryResponse(BaseModel):
    id: str
    title: str
    destination: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    days: list[DayResponse]
    created_at: datetime
    updated_at: datetime


class ItinerarySummary(BaseModel):
    id: str
    title: str
    destination: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    day_count: int
    created_at: datetime


# --- LLM Extraction ---
class ExtractionRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=10000)
    day_id: Optional[str] = None


class ExtractedActivity(BaseModel):
    name: str
    location: str
    duration_minutes: int
    description: str
    best_time: str


class ExtractionResponse(BaseModel):
    activities: list[ExtractedActivity]


# --- Reorder ---
class ReorderRequest(BaseModel):
    activity_ids: list[str]


# --- Move Activity ---
class MoveActivityRequest(BaseModel):
    activity_id: str
    source_day_id: str
    target_day_id: str
    new_order: int
