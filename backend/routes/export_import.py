import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from bson import ObjectId
from models import Itinerary, Day, Activity
from schemas import ItineraryResponse
from routes.itineraries import _itinerary_to_response

router = APIRouter(prefix="/api/itineraries", tags=["export-import"])


def _itinerary_to_export_dict(itin: Itinerary) -> dict:
    """Convert itinerary to a portable dict (no internal IDs)."""
    return {
        "format": "japan-planner-v1",
        "title": itin.title,
        "destination": itin.destination,
        "start_date": itin.start_date.isoformat() if itin.start_date else None,
        "end_date": itin.end_date.isoformat() if itin.end_date else None,
        "created_at": itin.created_at.isoformat() if itin.created_at else None,
        "days": [
            {
                "day_number": day.day_number,
                "date": day.date.isoformat() if day.date else None,
                "activities": [
                    {
                        "name": act.name,
                        "location": act.location or "",
                        "duration_minutes": act.duration_minutes,
                        "description": act.description or "",
                        "activity_order": act.activity_order,
                        "best_time": act.best_time,
                    }
                    for act in sorted(day.activities, key=lambda a: a.activity_order)
                ],
            }
            for day in sorted(itin.days, key=lambda d: d.day_number)
        ],
    }


def _itinerary_to_markdown(itin: Itinerary) -> str:
    """Convert itinerary to a Markdown string with YAML-like front matter for re-import."""
    data = _itinerary_to_export_dict(itin)
    lines = []
    # Front matter block (machine-readable for re-import)
    lines.append("<!-- japan-planner-v1")
    lines.append(f"title: {data['title']}")
    lines.append(f"destination: {data['destination']}")
    lines.append(f"start_date: {data['start_date'] or ''}")
    lines.append(f"end_date: {data['end_date'] or ''}")
    lines.append("-->")
    lines.append("")

    # Human-readable header
    lines.append(f"# {data['title']}")
    lines.append("")
    lines.append(f"**Destination:** {data['destination']}")
    if data["start_date"]:
        date_range = data["start_date"][:10]
        if data["end_date"]:
            date_range += f" → {data['end_date'][:10]}"
        lines.append(f"**Dates:** {date_range}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for day in data["days"]:
        date_str = ""
        if day["date"]:
            date_str = f" — {day['date'][:10]}"
        lines.append(f"## Day {day['day_number']}{date_str}")
        lines.append("")

        if not day["activities"]:
            lines.append("_No activities planned._")
            lines.append("")
            continue

        for act in day["activities"]:
            lines.append(f"### {act['name']}")
            meta_parts = []
            if act["location"]:
                meta_parts.append(f"📍 {act['location']}")
            meta_parts.append(f"⏱ {act['duration_minutes']} min")
            if act["best_time"] != "any":
                meta_parts.append(f"🕐 {act['best_time']}")
            lines.append(" | ".join(meta_parts))
            if act["description"]:
                lines.append("")
                lines.append(act["description"])
            lines.append("")

    return "\n".join(lines)


def _parse_markdown_import(content: str) -> dict:
    """Parse a markdown export back into an itinerary dict."""
    # Extract front matter
    fm_match = re.search(
        r"<!--\s*japan-planner-v1\s*\n(.*?)-->", content, re.DOTALL
    )
    if not fm_match:
        raise ValueError("Not a valid Japan Planner export (missing front matter)")

    fm_text = fm_match.group(1)
    fm = {}
    for line in fm_text.strip().splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            fm[key.strip()] = val.strip()

    data: dict = {
        "title": fm.get("title", "Imported Itinerary"),
        "destination": fm.get("destination", "Japan"),
        "start_date": fm.get("start_date") or None,
        "end_date": fm.get("end_date") or None,
        "days": [],
    }

    # Parse day sections
    day_pattern = re.compile(r"^## Day (\d+)(?:\s*—\s*(\S+))?", re.MULTILINE)
    activity_pattern = re.compile(r"^### (.+)$", re.MULTILINE)

    day_splits = list(day_pattern.finditer(content))
    for i, day_match in enumerate(day_splits):
        day_num = int(day_match.group(1))
        day_date = day_match.group(2) if day_match.group(2) else None

        # Get content until next day or end
        start = day_match.end()
        end = day_splits[i + 1].start() if i + 1 < len(day_splits) else len(content)
        day_content = content[start:end]

        activities = []
        act_splits = list(activity_pattern.finditer(day_content))
        for j, act_match in enumerate(act_splits):
            act_name = act_match.group(1).strip()
            act_start = act_match.end()
            act_end = act_splits[j + 1].start() if j + 1 < len(act_splits) else len(day_content)
            act_content = day_content[act_start:act_end].strip()

            # Parse meta line
            act_lines = act_content.splitlines()
            location = ""
            duration = 60
            best_time = "any"
            description = ""

            if act_lines:
                meta_line = act_lines[0]
                loc_m = re.search(r"📍\s*([^|⏱🕐]+)", meta_line)
                if loc_m:
                    location = loc_m.group(1).strip()
                dur_m = re.search(r"⏱\s*(\d+)\s*min", meta_line)
                if dur_m:
                    duration = int(dur_m.group(1))
                time_m = re.search(r"🕐\s*(\w+)", meta_line)
                if time_m:
                    best_time = time_m.group(1).strip()

                # Rest is description
                desc_lines = [l for l in act_lines[1:] if l.strip()]
                description = "\n".join(desc_lines).strip()

            activities.append({
                "name": act_name,
                "location": location,
                "duration_minutes": duration,
                "description": description,
                "activity_order": j,
                "best_time": best_time if best_time in ("morning", "afternoon", "evening", "any") else "any",
            })

        data["days"].append({
            "day_number": day_num,
            "date": day_date,
            "activities": activities,
        })

    return data


def _import_dict_to_itinerary(data: dict) -> Itinerary:
    """Create a new Itinerary document from an import dict."""
    def parse_date(val):
        if not val:
            return None
        try:
            return datetime.fromisoformat(val)
        except (ValueError, TypeError):
            return None

    itin = Itinerary(
        title=data.get("title", "Imported Itinerary"),
        destination=data.get("destination", "Japan"),
        start_date=parse_date(data.get("start_date")),
        end_date=parse_date(data.get("end_date")),
    )

    for day_data in data.get("days", []):
        day = Day(
            id=ObjectId(),
            day_number=day_data.get("day_number", 1),
            date=parse_date(day_data.get("date")),
        )
        for act_data in day_data.get("activities", []):
            best_time = act_data.get("best_time", "any")
            if best_time not in ("morning", "afternoon", "evening", "any"):
                best_time = "any"
            activity = Activity(
                id=ObjectId(),
                name=act_data["name"],
                location=act_data.get("location", ""),
                duration_minutes=act_data.get("duration_minutes", 60),
                description=act_data.get("description", ""),
                activity_order=act_data.get("activity_order", 0),
                best_time=best_time,
            )
            day.activities.append(activity)
        itin.days.append(day)

    itin.save()
    return itin


@router.get("/{itinerary_id}/export")
def export_itinerary(itinerary_id: str, format: str = Query("json", pattern="^(json|markdown)$")):
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")

    safe_title = re.sub(r'[^\w\s-]', '', itin.title).strip().replace(' ', '_')[:50]

    if format == "markdown":
        md = _itinerary_to_markdown(itin)
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.md"'},
        )
    else:
        import json
        data = _itinerary_to_export_dict(itin)
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.json"'},
        )


@router.post("/import", response_model=ItineraryResponse, status_code=201)
async def import_itinerary(file: UploadFile = File(...)):
    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 text")

    filename = file.filename or ""

    try:
        if filename.endswith(".md") or filename.endswith(".markdown"):
            data = _parse_markdown_import(content)
        else:
            import json
            data = json.loads(content)
            if data.get("format") != "japan-planner-v1":
                raise ValueError("Not a valid Japan Planner export (missing format field)")
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")

    itin = _import_dict_to_itinerary(data)
    return _itinerary_to_response(itin)
