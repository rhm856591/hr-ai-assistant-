# Docker Deployment Guide

## Prerequisites
1. Docker and Docker Compose installed
2. Docker Hub account
3. GitHub repository

## Setup Instructions

### 1. Configure GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token (create at https://hub.docker.com/settings/security)

### 2. Local Development with Docker

Build and run locally:
```bash
# Copy environment template
cp .env.docker .env

# Edit .env with your actual Vapi keys
nano .env

# Build and start
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### 3. Deploy to Production

#### Option A: Automatic (GitHub Actions)
1. Push to `main` or `master` branch:
   ```bash
   git add .
   git commit -m "Deploy to Docker Hub"
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Build the Docker image
   - Push to Docker Hub as `yourusername/ai-recruiter:latest`
   - Tag with branch name and commit SHA

#### Option B: Manual Build and Push
```bash
# Build
docker build -t yourusername/ai-recruiter:latest .

# Login to Docker Hub
docker login

# Push
docker push yourusername/ai-recruiter:latest
```

### 4. Run on Any Server

Pull and run the image:
```bash
# Create environment file
cat > .env << EOF
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_key_here
VAPI_API_KEY=your_key_here
EOF

# Run container
docker run -d \
  --name ai-recruiter \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/storage/recordings:/app/storage/recordings \
  -v $(pwd)/instruction.md:/app/instruction.md:ro \
  yourusername/ai-recruiter:latest
```

Or use docker-compose:
```bash
# Download docker-compose.yml from your repo
wget https://raw.githubusercontent.com/yourusername/yourrepo/main/docker-compose.yml

# Update image name in docker-compose.yml to use Docker Hub image
# Then run
docker-compose up -d
```

## Image Tags

The GitHub Action creates multiple tags:
- `latest` - Latest build from main branch
- `main` - Latest from main branch
- `main-<sha>` - Specific commit
- `v1.0.0` - Semantic version (if you push tags)

## Updating the Application

### Update Interview Script
```bash
# Edit instruction.md locally
nano instruction.md

# Restart container (mounts will update automatically)
docker-compose restart
```

### Update Code
```bash
# Push changes to GitHub
git push origin main

# On server, pull new image
docker pull yourusername/ai-recruiter:latest
docker-compose up -d
```

## Troubleshooting

### Check logs
```bash
docker-compose logs -f ai-recruiter
```

### Access container shell
```bash
docker exec -it ai-recruiter sh
```

### Rebuild without cache
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Storage

Recordings are persisted in `./storage/recordings` on the host machine, mapped to `/app/storage/recordings` in the container.

## Multi-Architecture Support

The GitHub Action builds for both:
- `linux/amd64` (Intel/AMD servers)
- `linux/arm64` (ARM servers, Apple Silicon)
