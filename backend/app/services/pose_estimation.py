"""Fas 1: extrahera grundläggande rörelsedata ur matchklipp.

Platshållare tills en riktig pose-estimation-pipeline (t.ex. MediaPipe eller
YOLO-pose) kopplas in.
"""

from pydantic import BaseModel


class MovementData(BaseModel):
    stance: str | None = None
    avg_activity_level: float | None = None
    duration_seconds: float | None = None


def extract_movement_data(video_path: str) -> MovementData:
    raise NotImplementedError("Pose estimation-pipeline är inte inkopplad än")
