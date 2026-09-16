FROM python:3.11-slim

# MediaPipe (pose-estimation) länkar mot EGL/GL vid import, även när den
# bara körs på CPU. Render har inte dessa systembibliotek i sin vanliga
# Python-runtime, därför Docker.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libegl1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
