FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY tg_autoreact ./tg_autoreact
COPY config.json ./config.json

# accounts.json и logs пробрасываются томом:
#   docker run -v $PWD/accounts.json:/app/accounts.json -v $PWD/logs:/app/logs ...
VOLUME ["/app/logs"]

# Порт веб-панели (включается в config.json).
EXPOSE 8088

CMD ["python", "-m", "tg_autoreact", "--config", "/app/config.json"]
