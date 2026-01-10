FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Tesseract and GL libs for OpenCV
# libgl1 and libglib2.0-0 are required for opencv-python-headless
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for cache optimization
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set default port (Railway will override this ENV with its own, but we use it as fallback)
ENV PORT=8080

# Start command
# Using sh -c ensures environment variables are expanded correctly
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
