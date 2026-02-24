from fastapi import APIRouter, HTTPException
from bson import ObjectId
from models import Itinerary, Day
from schemas import (
    ItineraryCreate,
    ItineraryUpdate,
    ItineraryResponse,
    ItinerarySummary,
    DayCreate,
    DayResponse,
    ActivityResponse,
)

router = APIRouter(prefix="/api/itineraries", tags=["itineraries"])


def _activity_to_response(act) -> ActivityResponse:
    return ActivityResponse(
        id=str(act.id),
        name=act.name,
        location=act.location or "",
        duration_minutes=act.duration_minutes,
        description=act.description or "",
        activity_order=act.activity_order,
        best_time=act.best_time,
        created_at=act.created_at,
    )


def _day_to_response(day) -> DayResponse:
    return DayResponse(
        id=str(day.id),
        date=day.date,
        day_number=day.day_number,
        activities=[_activity_to_response(a) for a in sorted(day.activities, key=lambda x: x.activity_order)],
    )


def _itinerary_to_response(itin) -> ItineraryResponse:
    return ItineraryResponse(
        id=str(itin.id),
        title=itin.title,
        destination=itin.destination,
        start_date=itin.start_date,
        end_date=itin.end_date,
        days=[_day_to_response(d) for d in sorted(itin.days, key=lambda x: x.day_number)],
        created_at=itin.created_at,
        updated_at=itin.updated_at,
    )


@router.get("/", response_model=list[ItinerarySummary])
def list_itineraries():
    itineraries = Itinerary.objects.order_by("-created_at")
    return [
        ItinerarySummary(
            id=str(i.id),
            title=i.title,
            destination=i.destination,
            start_date=i.start_date,
            end_date=i.end_date,
            day_count=len(i.days),
            created_at=i.created_at,
        )
        for i in itineraries
    ]


@router.post("/", response_model=ItineraryResponse, status_code=201)
def create_itinerary(data: ItineraryCreate):
    itin = Itinerary(
        title=data.title,
        destination=data.destination,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    itin.save()
    return _itinerary_to_response(itin)


@router.get("/{itinerary_id}", response_model=ItineraryResponse)
def get_itinerary(itinerary_id: str):
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")
    return _itinerary_to_response(itin)


@router.put("/{itinerary_id}", response_model=ItineraryResponse)
def update_itinerary(itinerary_id: str, data: ItineraryUpdate):
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(itin, key, value)
    itin.save()
    return _itinerary_to_response(itin)


@router.delete("/{itinerary_id}", status_code=204)
def delete_itinerary(itinerary_id: str):
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")
    itin.delete()


@router.post("/{itinerary_id}/days", response_model=DayResponse, status_code=201)
def add_day(itinerary_id: str, data: DayCreate):
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")

    day = Day(
        id=ObjectId(),
        date=data.date,
        day_number=data.day_number,
    )
    itin.days.append(day)
    itin.save()
    return _day_to_response(day)


@router.delete("/{itinerary_id}/days/{day_id}", status_code=204)
def delete_day(itinerary_id: str, day_id: str):
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")

    day_oid = ObjectId(day_id)
    itin.days = [d for d in itin.days if d.id != day_oid]
    itin.save()
