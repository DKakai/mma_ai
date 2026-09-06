# Combat AI — virtuell tränare för combat sports

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

Tidigt stadium. Uppladdningsflödet är kopplat till en enkel men riktig
pipeline: varje klipp läses med OpenCV för grundläggande metadata (längd,
upplösning, fps — ingen ffmpeg-installation krävs), och en Claude-genererad
kommentar skickas tillbaka baserat på det. Det är ett steg före fas 1 —
riktig rörelsedata/pose-estimation och fas 2:s manuella taggning är inte
byggda än, så analystexten är medvetet ytlig tills dess.

Kräver en `ANTHROPIC_API_KEY` för att LLM-delen ska fungera — se
[Deploy](#deploy-webben) nedan. Utan den markeras jobbet som "Misslyckades"
med ett tydligt felmeddelande istället för att krascha.

## Utveckling

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...   # krävs för LLM-analysen, annars markeras jobb som misslyckade
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deploy (webben)

Backend körs som en vanlig långlivad process (inte serverless) eftersom
analysjobben hålls i minnet och kommande faser (video/pose-estimation) behöver
längre körtider än vad serverless-funktioner tillåter.

### Backend → Render

1. Gå till [render.com](https://render.com) och skapa ett nytt **Blueprint**
   (New + → Blueprint), koppla GitHub-repot. Render läser `render.yaml` i
   repo-roten och sätter upp tjänsten automatiskt (rot: `backend/`).
2. Render frågar efter värdet för `ANTHROPIC_API_KEY` under uppsättningen
   (den är markerad som secret i `render.yaml` och synkas inte automatiskt).
   Skaffa en nyckel på [console.anthropic.com](https://console.anthropic.com)
   → **API Keys**, och klistra in den där. Kan även sättas/ändras senare under
   tjänstens **Environment**-flik.
3. När tjänsten är uppe, notera dess URL, t.ex.
   `https://combat-ai-backend.onrender.com`.

### Frontend → Vercel

1. Gå till [vercel.com](https://vercel.com) → **Add New Project** → importera
   samma GitHub-repo.
2. Sätt **Root Directory** till `frontend` (Vercel känner igen Vite
   automatiskt).
3. Lägg till miljövariabeln `VITE_API_BASE` = din Render-URL från steget ovan
   (t.ex. `https://combat-ai-backend.onrender.com`).
4. Deploya.

### Koppla ihop dem

Backend behöver veta vilken domän frontend körs på för att tillåta
anrop (CORS). I Render-tjänstens miljövariabler, sätt:

```
COMBAT_AI_CORS_ALLOW_ORIGINS=https://<ditt-projekt>.vercel.app,http://localhost:5173
```

och redeploya backend-tjänsten.
