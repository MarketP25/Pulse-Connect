# Use slim Python base
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2/Postgres
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies (with timeout and mirror for reliability)
RUN pip install --no-cache-dir -r requirements.txt --index-url https://pypi.org/simple --timeout 100

# Copy project files
COPY . .

# Default command: run Gunicorn
CMD ["gunicorn", "pulsco.wsgi:application", "--bind", "0.0.0.0:8000"]
