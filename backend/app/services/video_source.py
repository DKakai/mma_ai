"""Ladda ner ett klipp från en videolänk (yt-dlp) till en temporär fil, så
att samma analyspipeline som filuppladdning kan användas.

Bara YouTube-länkar tillåts just nu — dels för att begränsa vad servern
gör anrop mot (yt-dlp stödjer tusentals sajter, vilket annars öppnar upp
för att skicka in godtyckliga URL:er till backend), dels för att det är
det användaren efterfrågade.
"""

import tempfile
from urllib.parse import urlparse

import yt_dlp

_ALLOWED_HOSTS = {"youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"}
_MAX_DURATION_SECONDS = 15 * 60
_MAX_FILESIZE_BYTES = 200 * 1024 * 1024


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


def download_from_url(url: str) -> str:
    """Laddar ner klippet till en temp-fil och returnerar sökvägen.

    Anroparen ansvarar för att städa upp både filen och dess mapp
    (t.ex. via shutil.rmtree på mappen) när den är klar.
    """
    if not _is_allowed_url(url):
        raise InvalidVideoUrlError("Endast YouTube-länkar stöds just nu")

    probe_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
    }
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
        # Ett redan hopmuxat format (video+ljud i en fil) väljs medvetet
        # så vi slipper ett ffmpeg-beroende för att slå ihop separata
        # video-/ljudströmmar.
        "format": "best[height<=480][ext=mp4]/best[ext=mp4]/best",
        "outtmpl": f"{tmp_dir}/%(id)s.%(ext)s",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "max_filesize": _MAX_FILESIZE_BYTES,
    }
    try:
        with yt_dlp.YoutubeDL(download_opts) as ydl:
            result = ydl.extract_info(url, download=True)
            return ydl.prepare_filename(result)
    except yt_dlp.utils.DownloadError as e:
        raise DownloadError(f"Kunde inte ladda ner videon: {e}") from e
