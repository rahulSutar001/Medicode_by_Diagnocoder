FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies
# tesseract-ocr-eng is crucial for default English OCR
RUN apt-get update && apt-get install -y \
    build-essential \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Default port locally, overridden by Railway
ENV PORT=8080

# Use shell form for cleaner variable expansion & default parameter capability
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
