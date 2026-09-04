import uuid

from fastapi import APIRouter, HTTPException, UploadFile

from app.models.analysis import AnalysisJob, AnalysisStatus

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

_jobs: dict[str, AnalysisJob] = {}


@router.post("/upload", response_model=AnalysisJob)
async def upload_clip(file: UploadFile, fighter_name: str | None = None) -> AnalysisJob:
    job = AnalysisJob(id=str(uuid.uuid4()), fighter_name=fighter_name)
    _jobs[job.id] = job
    # TODO: spara filen och trigga pose_estimation + llm_analysis pipeline
    return job


@router.get("/{job_id}", response_model=AnalysisJob)
async def get_job(job_id: str) -> AnalysisJob:
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job
