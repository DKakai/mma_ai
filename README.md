# MMA AI — virtuell tränare för combat sports

En AI-driven assistent för MMA, boxning och kickboxning som hjälper tränare och
fighters att:

- **Analysera motståndare** inför en match — stil, tendenser, styrkor/svagheter,
  baserat på matchklipp och statistik.
- **Fungera som tränarassistent** — svara på frågor om teknik, taktik och
  gameplan, både för tränare och fighters.

## Arkitektur (planerad)

```
frontend/   Vite + React + TypeScript. Ladda upp matchklipp, se analyser, chatta med assistenten.
backend/    FastAPI (Python). Tar emot video, kör analyspipeline, exponerar API mot frontend.
  app/api/routes/     REST-endpoints (upload, analysis, chat)
  app/services/       Pose estimation, manuell taggning, LLM-analys
  app/core/           Config, delade inställningar
  app/models/         Datamodeller (Pydantic-scheman)
```

Video/CV-delen körs i Python eftersom ekosystemet för pose estimation
(MediaPipe, YOLO-pose m.fl.) är mest moget där. Frontend pratar med backend
via ett vanligt REST-API.

## Fasplan

Full automatisk teknikigenkänning från video (exakt slag-/sparktyp,
combos, takedowns) kräver tränade modeller och mycket data — det bygger vi
inte från dag ett. Istället:

1. **Fas 1 — Grunddata från video.** Ladda upp matchklipp. Backend kör en
   färdig pose-estimation-pipeline för att extrahera grundläggande
   rörelsedata (stance, tempo, aktivitetsnivå, position i ringen/buren).
2. **Fas 2 — Manuell taggning.** Tränare kan markera specifika sekvenser/
   tekniker i klippet (t.ex. "leverkick i klinch", "takedown försök"). Detta
   ger precision som ren CV inte klarar än, och bygger upp träningsdata för
   framtida automatisering.
3. **Fas 3 — LLM-analys.** En LLM tar rörelsedata + manuella taggar +
   ev. matchstatistik och genererar analystext: stil, tendenser,
   styrkor/svagheter, matchup-förslag.
4. **Fas 4 — Tränarassistent (chat).** Samma kunskapsbas används för att
   svara på löpande frågor från tränare/fighters om teknik och taktik.
5. **Fas 5 (senare) — Mer automatisk teknikigenkänning**, tränad på data
   som samlats in via den manuella taggningen i fas 2.

## Status

Tidigt scaffolding-stadium. Inget av ovanstående är byggt än — se
`backend/` och `frontend/` för nuvarande skelett.

## Utveckling

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
