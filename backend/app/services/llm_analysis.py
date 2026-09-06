"""Fas 3 (tidig version): generera en kort analystext från det vi faktiskt
vet om klippet just nu — klippets metadata och ev. fighter-namn. Riktig
rörelsedata (fas 1, pose-estimation) och manuella taggar (fas 2) kopplas in
senare och gör analysen mer underbyggd.
"""

import anthropic

from app.core.config import settings
from app.services.video_metadata import ClipMetadata

_MODEL = "claude-opus-5"


class LLMNotConfiguredError(Exception):
    pass


class LLMRequestError(Exception):
    pass


def generate_fighter_analysis(
    fighter_name: str | None,
    metadata: ClipMetadata,
) -> str:
    if not settings.anthropic_api_key:
        raise LLMNotConfiguredError(
            "ANTHROPIC_API_KEY är inte konfigurerad på backend-tjänsten"
        )

    who = fighter_name or "okänd fighter"
    prompt = (
        f"Ett matchklipp av {who} har laddats upp till en fighter-analys-app.\n\n"
        f"Vad vi faktiskt vet om klippet:\n"
        f"- Längd: {metadata.duration_seconds:.1f} sekunder\n"
        f"- Upplösning: {metadata.width}x{metadata.height}\n"
        f"- Bildfrekvens: {metadata.fps:.1f} fps\n\n"
        "Vi har ÄNNU INGEN rörelsedata eller teknikigenkänning från videon "
        "— bara den här grundmetadatan. Skriv 2-3 korta meningar på svenska "
        "som bekräftar att klippet togs emot och kort förklarar vad nästa "
        "analyssteg (rörelsedata från pose-estimation) kommer kunna visa. "
        "Hitta inte på stilanalys, styrkor eller svagheter du inte har "
        "underlag för."
    )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.AuthenticationError as e:
        raise LLMNotConfiguredError("ANTHROPIC_API_KEY är ogiltig") from e
    except anthropic.APIStatusError as e:
        raise LLMRequestError(f"Claude API-fel: {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise LLMRequestError("Kunde inte nå Claude API (nätverksfel)") from e

    return next(
        (block.text for block in response.content if block.type == "text"),
        "",
    )
