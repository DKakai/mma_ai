from enum import Enum

from pydantic import BaseModel


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class AnalysisJob(BaseModel):
    id: str
    fighter_name: str | None = None
    status: AnalysisStatus = AnalysisStatus.PENDING
    summary: str | None = None
