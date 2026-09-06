"""Fas 3: generera analystext från rörelsedata + manuella taggar.

Platshållare tills LLM-anropet kopplas in — medvetet väntat till dess att
fas 1 (pose-estimation) faktiskt kan identifiera en fighters stil, så att
analysen har verkligt underlag istället för att gissa.
"""

from app.services.pose_estimation import MovementData


def generate_fighter_analysis(
    fighter_name: str,
    movement_data: MovementData,
    manual_tags: list[str] | None = None,
) -> str:
    raise NotImplementedError("LLM-analys är inte inkopplad än")
