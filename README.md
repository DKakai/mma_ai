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

1. **Fas 1 — Grunddata från video.** ✅ Grunden byggd: backend kör
   pose-estimation (MediaPipe, CPU) på samplade bildrutor ur klippet —
   antal personer i bild och ett grovt rörelsemått per person. Riktig
   stance-klassificering, tempo och position i buren är inte byggt än.
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

Tidigt stadium, men uppladdningsflödet kör nu på riktig data i två steg:

1. **Metadata** (OpenCV) — längd, upplösning, fps. Ingen ffmpeg-installation
   krävs.
2. **Pose-estimation** (MediaPipe, CPU) — kör på ett antal jämnt utspridda
   bildrutor ur klippet: hur många personer som syns, och ett grovt,
   okalibrerat rörelsemått per person (baserat på hur mycket handleder/
   anklar flyttar sig mellan samplade bildrutor). Personerna spåras inte
   garanterat konsekvent genom hela klippet än, och det är inte en
   teknik- eller stilanalys — bara ett första steg mot fas 1. Varje samplad
   bildruta med en upptäckt person visas också som en bild med skelettet
   (33 punkter + leder) inritat, så man visuellt kan bedöma träffsäkerheten
   på riktig matchfilm — särskilt relevant eftersom modellen bara är testad
   mot ett syntetiskt exempel under utveckling, inte riktiga fightklipp.

Allt visas rakt av i UI:t som siffror och bilder, utan att låtsas vara mer
än det är.

Klipp kan också laddas in via en **YouTube-länk** istället för filuppladdning
(backend laddar ner klippet med `yt-dlp`, max 15 minuter långt). Bara
`youtube.com`/`youtu.be`-länkar tillåts just nu — inga andra sajter, för att
begränsa vilka URL:er backend gör anrop mot. Använd det bara för klipp du har
rätt att analysera.

YouTube blockerar ofta nedladdning från molnservrar (som Render) som
misstänkt bottrafik. Lösningen är att skicka med cookies från en inloggad
session — se [Deploy](#deploy-webben) nedan för hur du sätter upp det.

LLM-analysen (fas 3) är medvetet inte inkopplad än — den väntar tills
pose-datan är tillräckligt tillförlitlig (personspårning, fler
rörelsemått) för att en genererad text ska ha verkligt underlag.

**Obs:** MediaPipe kräver systembiblioteken `libEGL`/`libGL` som inte
finns i Renders vanliga Python-runtime. Backend körs därför via Docker
(se `backend/Dockerfile` och `render.yaml`) istället för native Python.

## Utveckling

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

På Linux kan `mediapipe` klaga på saknade `libEGL.so.1`/`libGL.so.1` vid
import (även fast allt körs på CPU). Installera då:
`sudo apt-get install -y libegl1 libgl1`. På macOS/Windows brukar det inte
behövas. Detta är också anledningen till att backend deployas via Docker
(se nedan) — Render har inte dessa bibliotek i sin vanliga Python-miljö.

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
2. När tjänsten är uppe, notera dess URL, t.ex.
   `https://combat-ai-backend.onrender.com`.

### YouTube-cookies (för att undvika bot-blockering)

YouTube kräver ofta inloggning för nedladdning från molnservrar. Ge yt-dlp
cookies från en riktig inloggad session:

1. Installera ett webbläsartillägg som exporterar cookies i Netscape-format,
   t.ex. **Get cookies.txt LOCALLY** (Chrome/Firefox).
2. Logga in på [youtube.com](https://youtube.com) i webbläsaren, exportera
   cookies för sajten med tillägget — du får en textfil.
3. I Render → `combat-ai-backend` → **Environment**, lägg till `YOUTUBE_COOKIES`
   och klistra in **hela innehållet** i cookiefilen som värde.

**Säkerhetsnotis:** det här kontots YouTube-inloggning finns då lagrad på
Render-servern. Använd helst ett konto du inte är orolig för om cookien
någon gång skulle läcka — aldrig ditt huvudkonto om du kan undvika det.
Committa **aldrig** cookiefilen till repot (den läggs bara in som en
hemlig miljövariabel i Render, precis som `sync: false` i `render.yaml`
markerar).

### Frontend → Vercel

1. Gå till [vercel.com](https://vercel.com) → **Add New Project** → importera
   samma GitHub-repo.
2. Sätt **Root Directory** till `frontend` (Vercel känner igen Vite
   automatiskt).
3. Lägg till miljövariabeln `VITE_API_BASE` = din Render-URL från steget ovan
   (t.ex. `https://combat-ai-backend.onrender.com`).
4. Deploya.

### Koppla ihop dem

Backend behöver veta vilken domän frontend körs på för att tillåta anrop
(CORS). Detta sätts via `COMBAT_AI_CORS_ALLOW_ORIGINS` i `render.yaml` —
**ändra värdet där i koden, inte bara i Render-dashboarden.** Render
skriver över manuella dashboard-ändringar av miljövariabler som finns i
`render.yaml` varje gång Blueprinten synkas (dvs. vid varje ny deploy), så
en ändring som bara görs i dashboarden försvinner vid nästa push.

```yaml
envVars:
  - key: COMBAT_AI_CORS_ALLOW_ORIGINS
    value: http://localhost:5173,https://<ditt-projekt>.vercel.app
```

och redeploya backend-tjänsten.
