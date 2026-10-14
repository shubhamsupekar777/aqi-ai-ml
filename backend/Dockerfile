FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (build essentials for potential native packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Start command with reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
