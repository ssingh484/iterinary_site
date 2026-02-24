import mongoengine
from config import get_settings


def connect_db():
    settings = get_settings()
    mongoengine.connect(
        db=settings.mongo_db,
        host=settings.mongo_url,
    )


def disconnect_db():
    mongoengine.disconnect()
