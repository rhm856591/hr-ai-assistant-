# Docker Quick Start

## 🚀 Deploy in 3 Steps

### 1. Setup GitHub Secrets
Add to your GitHub repo (Settings → Secrets → Actions):
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token

### 2. Push to GitHub
```bash
git add .
git commit -m "Add Docker support"
git push origin main
```

### 3. GitHub Actions Will Automatically:
✅ Build optimized Docker image  
✅ Push to Docker Hub as `yourusername/ai-recruiter:latest`  
✅ Support multi-architecture (AMD64 + ARM64)

## 📦 What's Included

- **Dockerfile** - Multi-stage build for minimal image size
- **docker-compose.yml** - Easy local development
- **.github/workflows/docker-publish.yml** - Automated CI/CD
- **DOCKER_DEPLOYMENT.md** - Full deployment guide

## 🏃 Run Locally

```bash
# Copy and configure environment
cp .env.docker .env
nano .env  # Add your Vapi keys

# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🌐 Deploy Anywhere

Once pushed to Docker Hub, run on any server:

```bash
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_key \
  -e VAPI_API_KEY=your_key \
  -v $(pwd)/storage:/app/storage \
  yourusername/ai-recruiter:latest
```

Access at `http://localhost:3000`

---

See **DOCKER_DEPLOYMENT.md** for complete documentation.
