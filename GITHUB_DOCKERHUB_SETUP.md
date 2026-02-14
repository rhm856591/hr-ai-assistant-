# Setting Up Docker Hub with GitHub Actions

## Step 1: Create Docker Hub Access Token

1. Go to **Docker Hub**: https://hub.docker.com/
2. Sign in to your account
3. Click your **username** (top right) → **Account Settings**
4. Click **Security** in the left sidebar
5. Click **New Access Token**
6. Give it a name (e.g., "GitHub Actions")
7. Set permissions to **Read, Write, Delete**
8. Click **Generate**
9. **COPY THE TOKEN** - you won't see it again!

## Step 2: Add Secrets to GitHub

### Method 1: Via GitHub Web Interface (Recommended)

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

5. Add first secret:
   - Name: `DOCKERHUB_USERNAME`
   - Value: Your Docker Hub username (e.g., `johndoe`)
   - Click **Add secret**

6. Add second secret:
   - Click **New repository secret** again
   - Name: `DOCKERHUB_TOKEN`
   - Value: Paste the access token you copied from Docker Hub
   - Click **Add secret**

### Method 2: Via GitHub CLI (Alternative)

```bash
# Install GitHub CLI if needed
# https://cli.github.com/

# Login to GitHub
gh auth login

# Add secrets
gh secret set DOCKERHUB_USERNAME -b"your_dockerhub_username"
gh secret set DOCKERHUB_TOKEN -b"your_dockerhub_token"
```

## Step 3: Verify Setup

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. You should see:
   - ✅ `DOCKERHUB_USERNAME`
   - ✅ `DOCKERHUB_TOKEN`

## Step 4: Test the Workflow

```bash
# Make a small change
echo "# Docker Test" >> README.md

# Commit and push
git add .
git commit -m "Test Docker Hub deployment"
git push origin main
```

## Step 5: Monitor the Build

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see "Build and Push Docker Image" workflow running
4. Click on it to see the progress
5. Once complete, check Docker Hub for your image

## Troubleshooting

### Error: "unauthorized: incorrect username or password"
- **Solution**: Regenerate your Docker Hub token and update the `DOCKERHUB_TOKEN` secret

### Error: "denied: requested access to the resource is denied"
- **Solution**: Make sure your Docker Hub username is correct in `DOCKERHUB_USERNAME`
- Check that the repository name in `.github/workflows/docker-publish.yml` matches your Docker Hub username

### Workflow doesn't trigger
- **Solution**: Make sure you're pushing to `main` or `master` branch
- Check the workflow file is in `.github/workflows/` directory

## What Happens After Push?

1. GitHub Actions detects the push
2. Builds your Docker image using the Dockerfile
3. Tags it with:
   - `latest` (for main branch)
   - `main` (branch name)
   - `main-abc123` (commit SHA)
4. Pushes all tags to Docker Hub
5. Your image is now available at: `docker.io/yourusername/ai-recruiter:latest`

## Using Your Image

Anyone can now pull and run your image:

```bash
docker pull yourusername/ai-recruiter:latest
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_key \
  -e VAPI_API_KEY=your_key \
  yourusername/ai-recruiter:latest
```

## Security Best Practices

✅ **DO:**
- Use access tokens (not your Docker Hub password)
- Set token permissions to minimum required (Read, Write)
- Rotate tokens periodically
- Use GitHub Secrets (never commit tokens to code)

❌ **DON'T:**
- Share your access token
- Commit tokens to your repository
- Use your Docker Hub password in GitHub Actions
- Give tokens more permissions than needed

## Next Steps

After successful deployment:
1. Check your image on Docker Hub: `https://hub.docker.com/r/yourusername/ai-recruiter`
2. Deploy to production using the image
3. Set up automated deployments on your server
