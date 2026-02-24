import json
import logging
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from models import Itinerary, Activity
from schemas import ExtractionRequest, ExtractionResponse, ExtractedActivity
from config import get_settings
from routes.itineraries import _activity_to_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/extract", tags=["extraction"])

EXTRACTION_PROMPT = """You are a travel planning assistant. Extract structured activity information from the following research text about Japan travel.

For each distinct activity, place, or experience mentioned, extract:
- name: Short descriptive name
- location: Specific location/address/area
- duration_minutes: Estimated time needed (integer, in minutes)
- description: Brief description of the activity
- best_time: When is the best time to do this ("morning", "afternoon", "evening", or "any")

Return a JSON object with an "activities" array. Each element must have exactly these fields:
{
  "activities": [
    {
      "name": "string",
      "location": "string",
      "duration_minutes": integer,
      "description": "string",
      "best_time": "morning|afternoon|evening|any"
    }
  ]
}

Only return the JSON object, no other text.

Research text:
"""


@router.post("/", response_model=ExtractionResponse)
async def extract_activities(data: ExtractionRequest):
    settings = get_settings()

    if not settings.aws_access_key_id or settings.aws_access_key_id == "your_access_key":
        raise HTTPException(
            status_code=503,
            detail="AWS Bedrock credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env",
        )

    try:
        import boto3

        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_default_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "messages": [
                    {
                        "role": "user",
                        "content": EXTRACTION_PROMPT + data.text,
                    }
                ],
            }
        )

        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())
        content = response_body["content"][0]["text"]

        # Parse JSON from response
        parsed = json.loads(content)
        activities = [ExtractedActivity(**a) for a in parsed["activities"]]
        return ExtractionResponse(activities=activities)

    except json.JSONDecodeError:
        logger.exception("Failed to parse LLM response as JSON")
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON response")
    except Exception as e:
        logger.exception("LLM extraction failed")
        raise HTTPException(status_code=502, detail=f"LLM extraction failed: {str(e)}")


@router.post("/apply/{itinerary_id}/days/{day_id}")
async def apply_extracted_activities(itinerary_id: str, day_id: str, data: ExtractionResponse):
    """Apply extracted activities to a specific day."""
    try:
        itin = Itinerary.objects.get(id=ObjectId(itinerary_id))
    except Itinerary.DoesNotExist:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")

    day_oid = ObjectId(day_id)
    day = None
    for d in itin.days:
        if d.id == day_oid:
            day = d
            break
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")

    max_order = max((a.activity_order for a in day.activities), default=-1)

    added = []
    for i, act_data in enumerate(data.activities):
        activity = Activity(
            id=ObjectId(),
            name=act_data.name,
            location=act_data.location,
            duration_minutes=act_data.duration_minutes,
            description=act_data.description,
            activity_order=max_order + 1 + i,
            best_time=act_data.best_time,
        )
        day.activities.append(activity)
        added.append(_activity_to_response(activity))

    itin.save()
    return {"added": len(added), "activities": added}
