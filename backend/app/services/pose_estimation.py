"""Fas 1: pose-estimation på CPU med MediaPipe (BlazePose "lite").

Körs på ett antal jämnt utspridda bildrutor ur klippet (inte alla — video
kan ha hundratals bildrutor och pose-estimation är förhållandevis tungt).
VIDEO-läget (istället för IMAGE) används så att MediaPipe kan hålla samma
person vid samma index mellan bildrutor, vilket krävs för att räkna ut
rörelse per person.

Ingen identifiering av VEM personerna är — bara att det finns personer,
var deras leder är i varje samplad bildruta, och hur mycket de rör sig.
"""

import base64
from pathlib import Path

import cv2
import mediapipe as mp
from pydantic import BaseModel

from app.models.analysis import PersonMovement

_MODEL_PATH = Path(__file__).resolve().parents[2] / "ml_models" / "pose_landmarker_lite.task"

_vision = mp.tasks.vision
_LANDMARK_NAMES = [lm.name for lm in _vision.PoseLandmark]
_POSE_CONNECTIONS = _vision.PoseLandmarksConnections.POSE_LANDMARKS

# Ett litet urval leder räcker för ett grovt rörelsemått.
_MOVEMENT_LANDMARKS = {"LEFT_WRIST", "RIGHT_WRIST", "LEFT_ANKLE", "RIGHT_ANKLE"}

_ANNOTATED_MAX_WIDTH = 640
_ANNOTATED_JPEG_QUALITY = 75


class MovementData(BaseModel):
    frames_sampled: int
    max_people_in_frame: int
    people: list[PersonMovement]
    annotated_frames: list[str] = []


def _sample_frame_indices(frame_count: int, num_samples: int) -> list[int]:
    if frame_count <= 0:
        return []
    if frame_count <= num_samples:
        return list(range(frame_count))
    step = frame_count / num_samples
    return [int(i * step) for i in range(num_samples)]


def _make_landmarker(num_poses: int):
    base_options = mp.tasks.BaseOptions(model_asset_path=str(_MODEL_PATH))
    options = _vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=_vision.RunningMode.VIDEO,
        num_poses=num_poses,
        min_pose_detection_confidence=0.4,
    )
    return _vision.PoseLandmarker.create_from_options(options)


def _annotate_frame(frame_bgr, people_landmarks: list) -> str | None:
    """Ritar skelett (33 punkter + leder) för varje upptäckt person på en
    kopia av bildrutan, och returnerar den som en base64-kodad JPEG-datauri
    — så man kan se med egna ögon var modellen tror att lederna sitter."""
    height, width = frame_bgr.shape[:2]
    if width > _ANNOTATED_MAX_WIDTH:
        scale = _ANNOTATED_MAX_WIDTH / width
        frame_bgr = cv2.resize(frame_bgr, (int(width * scale), int(height * scale)))

    annotated = frame_bgr.copy()
    for landmarks in people_landmarks:
        _vision.drawing_utils.draw_landmarks(annotated, landmarks, _POSE_CONNECTIONS)

    ok, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, _ANNOTATED_JPEG_QUALITY])
    if not ok:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("ascii")


def _activity_from_series(series: list[dict[str, tuple[float, float]]]) -> PersonMovement:
    frames_detected = len(series)
    if frames_detected < 2:
        return PersonMovement(frames_detected=frames_detected, activity_level=None)

    total_movement = 0.0
    pairs = 0
    for prev, curr in zip(series, series[1:]):
        for name, (px, py) in prev.items():
            if name in curr:
                cx, cy = curr[name]
                total_movement += ((cx - px) ** 2 + (cy - py) ** 2) ** 0.5
                pairs += 1

    activity_level = round(total_movement / pairs, 4) if pairs else None
    return PersonMovement(frames_detected=frames_detected, activity_level=activity_level)


def extract_movement_data(
    video_path: str, num_samples: int = 8, max_people: int = 2
) -> MovementData:
    capture = cv2.VideoCapture(video_path)
    try:
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        wanted_indices = set(_sample_frame_indices(frame_count, num_samples))

        series: list[list[dict[str, tuple[float, float]]]] = [[] for _ in range(max_people)]
        max_people_seen = 0
        annotated_frames: list[str] = []

        with _make_landmarker(max_people) as landmarker:
            frame_idx = 0
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                if frame_idx in wanted_indices:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                    timestamp_ms = int((frame_idx / fps) * 1000)
                    result = landmarker.detect_for_video(mp_image, timestamp_ms)

                    max_people_seen = max(max_people_seen, len(result.pose_landmarks))
                    for person_idx, landmarks in enumerate(result.pose_landmarks[:max_people]):
                        points = {
                            _LANDMARK_NAMES[i]: (lm.x, lm.y)
                            for i, lm in enumerate(landmarks)
                            if _LANDMARK_NAMES[i] in _MOVEMENT_LANDMARKS
                        }
                        series[person_idx].append(points)

                    if result.pose_landmarks:
                        annotated = _annotate_frame(frame, result.pose_landmarks)
                        if annotated:
                            annotated_frames.append(annotated)
                frame_idx += 1
    finally:
        capture.release()

    people = [_activity_from_series(s) for s in series if s]

    return MovementData(
        frames_sampled=len(wanted_indices),
        max_people_in_frame=max_people_seen,
        people=people,
        annotated_frames=annotated_frames,
    )
