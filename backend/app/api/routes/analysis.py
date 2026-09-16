import os
import shutil
import tempfile
import uuid

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.analysis import AnalysisJob, AnalysisStatus
from app.services.pose_estimation import extract_movement_data
from app.services.video_metadata import UnreadableVideoError, extract_clip_metadata
from app.services.video_source import DownloadError, InvalidVideoUrlError, download_from_url

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

_jobs: dict[str, AnalysisJob] = {}


def _run_pipeline(job: AnalysisJob, video_path: str) -> None:
    """Kör metadata- + pose-pipelinen på en redan sparad videofil och
    uppdaterar jobbet in-place."""
    try:
        metadata = extract_clip_metadata(video_path)
        job.duration_seconds = round(metadata.duration_seconds, 1)
        job.width = metadata.width
        job.height = metadata.height
        job.fps = round(metadata.fps, 1)

        movement = extract_movement_data(video_path)
        job.frames_sampled = movement.frames_sampled
        job.max_people_in_frame = movement.max_people_in_frame
        job.people = movement.people

        job.status = AnalysisStatus.DONE
    except UnreadableVideoError as e:
        job.status = AnalysisStatus.FAILED
        job.summary = str(e)


@router.post("/upload", response_model=AnalysisJob)
async def upload_clip(file: UploadFile, fighter_name: str | None = None) -> AnalysisJob:
    job = AnalysisJob(
        id=str(uuid.uuid4()),
        fighter_name=fighter_name,
        status=AnalysisStatus.PROCESSING,
    )
    _jobs[job.id] = job

    suffix = os.path.splitext(file.filename or "")[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        _run_pipeline(job, tmp_path)
    finally:
        os.unlink(tmp_path)

    return job


class VideoUrlRequest(BaseModel):
    url: str
    fighter_name: str | None = None


@router.post("/from-url", response_model=AnalysisJob)
async def analyze_from_url(payload: VideoUrlRequest) -> AnalysisJob:
    job = AnalysisJob(
        id=str(uuid.uuid4()),
        fighter_name=payload.fighter_name,
        status=AnalysisStatus.PROCESSING,
    )
    _jobs[job.id] = job

    try:
        video_path = download_from_url(payload.url)
    except (InvalidVideoUrlError, DownloadError) as e:
        job.status = AnalysisStatus.FAILED
        job.summary = str(e)
        return job

    try:
        _run_pipeline(job, video_path)
    finally:
        shutil.rmtree(os.path.dirname(video_path), ignore_errors=True)

    return job


@router.get("/{job_id}", response_model=AnalysisJob)
async def get_job(job_id: str) -> AnalysisJob:
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job
