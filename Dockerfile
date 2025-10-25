FROM python:3.10-slim

WORKDIR /app

# Sadece backend bağımlılıklarını al ✅
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip install -r requirements.txt

# Backend kodunu al — UI dahil değil ✅
COPY src ./src
COPY data ./data
COPY .env .env

# UI klasörü kopyalanmıyor ❌
# COPY ui ./ui  --- YOK

ENV PYTHONPATH=/app

EXPOSE 8000
CMD ["uvicorn", "src.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
