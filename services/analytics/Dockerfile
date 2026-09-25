FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY services/analytics/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/analytics/ .
COPY packages/contracts ./packages/contracts

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
