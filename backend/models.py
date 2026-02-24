import mongoengine as me
from datetime import datetime
from bson import ObjectId


class Activity(me.EmbeddedDocument):
    id = me.ObjectIdField(default=ObjectId)
    name = me.StringField(required=True, max_length=200)
    location = me.StringField(max_length=300)
    duration_minutes = me.IntField(default=60)
    description = me.StringField()
    activity_order = me.IntField(default=0)
    best_time = me.StringField(choices=["morning", "afternoon", "evening", "any"], default="any")
    created_at = me.DateTimeField(default=datetime.utcnow)


class Day(me.EmbeddedDocument):
    id = me.ObjectIdField(default=ObjectId)
    date = me.DateTimeField()
    day_number = me.IntField(required=True)
    activities = me.EmbeddedDocumentListField(Activity, default=list)


class Itinerary(me.Document):
    title = me.StringField(required=True, max_length=200)
    destination = me.StringField(default="Japan")
    start_date = me.DateTimeField()
    end_date = me.DateTimeField()
    days = me.EmbeddedDocumentListField(Day, default=list)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "itineraries",
        "indexes": ["destination"],
        "ordering": ["-created_at"],
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)
