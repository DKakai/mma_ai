from enum import Enum

from pydantic import BaseModel


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class PersonMovement(BaseModel):
    frames_detected: int
    activity_level: float | None = None


class AnalysisJob(BaseModel):
    id: str
    fighter_name: str | None = None
    status: AnalysisStatus = AnalysisStatus.PENDING
    summary: str | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    frames_sampled: int | None = None
    max_people_in_frame: int | None = None
    people: list[PersonMovement] = []
    annotated_frames: list[str] = []
