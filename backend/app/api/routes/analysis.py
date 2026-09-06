import os
import tempfile
import uuid

from fastapi import APIRouter, HTTPException, UploadFile

from app.models.analysis import AnalysisJob, AnalysisStatus
from app.services.llm_analysis import (
    LLMNotConfiguredError,
    LLMRequestError,
    generate_fighter_analysis,
)
from app.services.video_metadata import UnreadableVideoError, extract_clip_metadata

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

_jobs: dict[str, AnalysisJob] = {}


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
        metadata = extract_clip_metadata(tmp_path)
        job.summary = generate_fighter_analysis(fighter_name, metadata)
        job.status = AnalysisStatus.DONE
    except UnreadableVideoError as e:
        job.status = AnalysisStatus.FAILED
        job.summary = str(e)
    except (LLMNotConfiguredError, LLMRequestError) as e:
        job.status = AnalysisStatus.FAILED
        job.summary = str(e)
    finally:
        os.unlink(tmp_path)

    return job


@router.get("/{job_id}", response_model=AnalysisJob)
async def get_job(job_id: str) -> AnalysisJob:
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job
