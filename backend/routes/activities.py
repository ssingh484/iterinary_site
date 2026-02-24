from fastapi import APIRouter, HTTPException
from bson import ObjectId
from models import Itinerary, Activity
from schemas import (
    ActivityCreate,
    ActivityUpdate,
    ActivityResponse,
    ReorderRequest,
    MoveActivityRequest,
)
from routes.itineraries import _activity_to_response

router = APIRouter(prefix="/api/itineraries/{itinerary_id}", tags=["activities"])


def _get_itinerary(itinerary_id: str) -> Itinerary:
    try:
        return Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")


def _find_day(itin: Itinerary, day_id: str):
    day_oid = ObjectId(day_id)
    for day in itin.days:
        if day.id == day_oid:
            return day
    raise HTTPException(status_code=404, detail="Day not found")


@router.post("/days/{day_id}/activities", response_model=ActivityResponse, status_code=201)
def add_activity(itinerary_id: str, day_id: str, data: ActivityCreate):
    itin = _get_itinerary(itinerary_id)
    day = _find_day(itin, day_id)

    # Auto-set order to end of list
    max_order = max((a.activity_order for a in day.activities), default=-1)
    activity = Activity(
        id=ObjectId(),
        name=data.name,
        location=data.location,
        duration_minutes=data.duration_minutes,
        description=data.description,
        activity_order=data.activity_order if data.activity_order > 0 else max_order + 1,
        best_time=data.best_time,
    )
    day.activities.append(activity)
    itin.save()
    return _activity_to_response(activity)


@router.put("/days/{day_id}/activities/{activity_id}", response_model=ActivityResponse)
def update_activity(itinerary_id: str, day_id: str, activity_id: str, data: ActivityUpdate):
    itin = _get_itinerary(itinerary_id)
    day = _find_day(itin, day_id)

    act_oid = ObjectId(activity_id)
    activity = None
    for a in day.activities:
        if a.id == act_oid:
            activity = a
            break
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(activity, key, value)
    itin.save()
    return _activity_to_response(activity)


@router.delete("/days/{day_id}/activities/{activity_id}", status_code=204)
def delete_activity(itinerary_id: str, day_id: str, activity_id: str):
    itin = _get_itinerary(itinerary_id)
    day = _find_day(itin, day_id)

    act_oid = ObjectId(activity_id)
    day.activities = [a for a in day.activities if a.id != act_oid]
    itin.save()


@router.patch("/days/{day_id}/reorder", response_model=list[ActivityResponse])
def reorder_activities(itinerary_id: str, day_id: str, data: ReorderRequest):
    itin = _get_itinerary(itinerary_id)
    day = _find_day(itin, day_id)

    # Build lookup
    act_map = {str(a.id): a for a in day.activities}

    # Validate all IDs exist
    for aid in data.activity_ids:
        if aid not in act_map:
            raise HTTPException(status_code=400, detail=f"Activity {aid} not found in this day")

    # Reorder
    for i, aid in enumerate(data.activity_ids):
        act_map[aid].activity_order = i

    itin.save()
    return [_activity_to_response(a) for a in sorted(day.activities, key=lambda x: x.activity_order)]


@router.post("/move-activity")
def move_activity(itinerary_id: str, data: MoveActivityRequest):
    itin = _get_itinerary(itinerary_id)
    source_day = _find_day(itin, data.source_day_id)
    target_day = _find_day(itin, data.target_day_id)

    # Find and remove from source
    act_oid = ObjectId(data.activity_id)
    activity = None
    for a in source_day.activities:
        if a.id == act_oid:
            activity = a
            break
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found in source day")

    source_day.activities = [a for a in source_day.activities if a.id != act_oid]

    # Reorder source day
    for i, a in enumerate(sorted(source_day.activities, key=lambda x: x.activity_order)):
        a.activity_order = i

    # Insert into target at position
    activity.activity_order = data.new_order
    target_day.activities.append(activity)

    # Reorder target day
    sorted_target = sorted(target_day.activities, key=lambda x: x.activity_order)
    for i, a in enumerate(sorted_target):
        a.activity_order = i

    itin.save()
    return {"status": "ok"}
