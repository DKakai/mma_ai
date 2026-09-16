FROM python:3.11-slim

# MediaPipe (pose-estimation) länkar mot EGL/GLES vid import, även fast vi
# bara kör på CPU. Render har inte dessa systembibliotek i sin vanliga
# Python-runtime, därför Docker.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libegl1 \
    libgl1 \
    libgles2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# mediapipe drar in opencv-contrib-python (GUI-variant med tunga Qt/X11-
# beroenden) som ett transitivt beroende, och den vinner över vår tänkta
# headless-variant vid "import cv2". Tvinga tillbaka headless-varianten
# (utan GUI-beroenden) efter att alla paket är installerade.
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --force-reinstall --no-deps opencv-python-headless==4.10.0.84

COPY . .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
