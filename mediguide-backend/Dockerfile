# Base Image - Stable Python 3.11 Slim
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
# tesseract-ocr: Required for OCR
# libgl1, libglib2.0-0: Required for opencv-python-headless (fixes immediate crash)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway expects usage of $PORT, but we document 8080)
EXPOSE 8080

# Start command - STRICTLY use Railway's PORT env var
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
