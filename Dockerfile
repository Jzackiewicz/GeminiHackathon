# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend source
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
# Build the frontend (outputs to /app/frontend/dist)
RUN npm run build


# ==========================================
# Stage 2: Build the Python Backend
# ==========================================
FROM python:3.12-slim

# Install system dependencies (Node.js is still required for your Stitch SDK PDF generation)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt backend/package.json backend/package-lock.json* ./

# Install Python and Node.js dependencies for backend
RUN pip install --no-cache-dir -r requirements.txt
RUN npm install

# Copy backend source code
COPY backend/ ./

# Copy built frontend assets from Stage 1 into the backend's 'dist' folder
COPY --from=frontend-builder /app/frontend/dist /app/dist

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
