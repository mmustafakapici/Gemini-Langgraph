FROM python:3.10-slim

WORKDIR /app

# Sistem paketleri (opsiyonel)
RUN apt-get update && apt-get install -y git

# Gereksinim dosyalarını önce kopyala (cache için)
COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip install -r requirements.txt

# 🔥 En kritik satır: Projenin tamamını /app içine kopyala
COPY . .

# Python modül yolu düzgün olsun
ENV PYTHONPATH=/app

# Ana uygulamayı başlat
CMD ["python", "-m", "src.main"]
