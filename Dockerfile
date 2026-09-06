# Production Dockerfile for Google Cloud Run (dev-tutorial=cloud-run-ai-challenge)
FROM node:22-alpine

WORKDIR /app

# System dependencies
RUN apk add --no-cache curl

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy root and frontend package definitions
COPY package*.json ./
COPY "frontend google/package*.json" "./frontend google/"

# Install dependencies
RUN npm install --include=dev
RUN cd "frontend google" && npm install

# Copy application source code
COPY . .

# Expose Cloud Run default port 3000
EXPOSE 3000

# Start backend on 3001 and frontend on 3000
CMD ["node", "start-prod.mjs"]
