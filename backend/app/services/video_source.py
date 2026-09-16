"""Ladda ner ett klipp från en videolänk (yt-dlp) till en temporär fil, så
att samma analyspipeline som filuppladdning kan användas.

Bara YouTube-länkar tillåts just nu — dels för att begränsa vad servern
gör anrop mot (yt-dlp stödjer tusentals sajter, vilket annars öppnar upp
för att skicka in godtyckliga URL:er till backend), dels för att det är
det användaren efterfrågade.
"""

import os
import tempfile
from urllib.parse import urlparse

import yt_dlp

from app.core.config import settings

_ALLOWED_HOSTS = {"youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"}
_MAX_DURATION_SECONDS = 15 * 60
_MAX_FILESIZE_BYTES = 200 * 1024 * 1024

_cookies_file_path: str | None = None


class InvalidVideoUrlError(Exception):
    pass


class DownloadError(Exception):
    pass


def _is_allowed_url(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return False
    return host.lower() in _ALLOWED_HOSTS


def _cookies_file() -> str | None:
    """Skriver YOUTUBE_COOKIES (Netscape cookies.txt-format) till en
    temp-fil vid första användning och återanvänder den sedan — YouTube
    blockerar ofta nedladdning från molnservrar som bottrafik annars."""
    global _cookies_file_path
    if not settings.youtube_cookies:
        return None
    if _cookies_file_path is None:
        fd, path = tempfile.mkstemp(suffix=".txt", prefix="yt_cookies_")
        with os.fdopen(fd, "w") as f:
            f.write(settings.youtube_cookies)
        _cookies_file_path = path
    return _cookies_file_path


def _base_opts() -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        # yt-dlp löser YouTubes JS-utmaning (krävs för att undvika "The page
        # needs to be reloaded") med en lokal JS-runtime. Bara "deno" är
        # aktiverad som standard — lägg även till "bun" (installerad i
        # Dockerfile) så det funkar utan att en specifik runtime krävs.
        "js_runtimes": {"deno": {}, "bun": {}},
        # bun/deno kör bara utmaningen — själva lösnings-skriptet måste
        # dessutom hämtas separat (yt-dlp laddar inte ner det per default).
        # Utan detta hoppas JS-utmaningen över helt ("Remote components
        # challenge solver script ... were skipped").
        "remote_components": {"ejs:github"},
    }
    cookies_path = _cookies_file()
    if cookies_path:
        # Cookies är inloggningsdata för webb-klienten — tv/android-klienterna
        # autentiserar inte med webbläsar-cookies, så att tvinga fram dem
        # samtidigt som cookies skickas ger en trasig, halvinloggad session
        # (visar sig t.ex. som "The page needs to be reloaded"). Låt yt-dlp
        # välja klient normalt (web) när vi faktiskt har cookies.
        opts["cookiefile"] = cookies_path
    else:
        # Utan cookies: låtsas vara YouTubes tv-/android-klienter istället
        # för webbläsaren. De slipper ofta "sign in to confirm you're not a
        # bot" som annars drabbar molnserver-IP:er — gratis att prova.
        opts["extractor_args"] = {"youtube": {"player_client": ["tv", "android"]}}
    return opts


def download_from_url(url: str) -> str:
    """Laddar ner klippet till en temp-fil och returnerar sökvägen.

    Anroparen ansvarar för att städa upp både filen och dess mapp
    (t.ex. via shutil.rmtree på mappen) när den är klar.
    """
    if not _is_allowed_url(url):
        raise InvalidVideoUrlError("Endast YouTube-länkar stöds just nu")

    probe_opts = {**_base_opts(), "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(probe_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        raise DownloadError(f"Kunde inte läsa videoinformation: {e}") from e

    duration = (info or {}).get("duration") or 0
    if duration > _MAX_DURATION_SECONDS:
        raise InvalidVideoUrlError(
            f"Klippet är {duration // 60} minuter långt — "
            f"max {_MAX_DURATION_SECONDS // 60} minuter stöds just nu"
        )

    tmp_dir = tempfile.mkdtemp()
    download_opts = {
        **_base_opts(),
        # Ett redan hopmuxat format (video+ljud i en fil) väljs medvetet
        # så vi slipper ett ffmpeg-beroende för att slå ihop separata
        # video-/ljudströmmar.
        "format": "best[height<=480][ext=mp4]/best[ext=mp4]/best",
        "outtmpl": f"{tmp_dir}/%(id)s.%(ext)s",
        "max_filesize": _MAX_FILESIZE_BYTES,
    }
    try:
        with yt_dlp.YoutubeDL(download_opts) as ydl:
            result = ydl.extract_info(url, download=True)
            return ydl.prepare_filename(result)
    except yt_dlp.utils.DownloadError as e:
        raise DownloadError(f"Kunde inte ladda ner videon: {e}") from e
