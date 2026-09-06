"""Lättviktigt steg före riktig pose-estimation (fas 1): läs grundläggande
metadata ur ett videoklipp med OpenCV, som paketerar sina egna avkodare och
därför inte kräver en systeminstallerad ffmpeg-binär (viktigt på Render).
"""

import cv2
from pydantic import BaseModel


class ClipMetadata(BaseModel):
    duration_seconds: float
    width: int
    height: int
    fps: float
    frame_count: int


class UnreadableVideoError(Exception):
    pass


def extract_clip_metadata(video_path: str) -> ClipMetadata:
    capture = cv2.VideoCapture(video_path)
    try:
        if not capture.isOpened():
            raise UnreadableVideoError("Kunde inte öppna videofilen")

        fps = capture.get(cv2.CAP_PROP_FPS)
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
            raise UnreadableVideoError("Videofilen saknar läsbar metadata")

        return ClipMetadata(
            duration_seconds=frame_count / fps,
            width=width,
            height=height,
            fps=fps,
            frame_count=frame_count,
        )
    finally:
        capture.release()
