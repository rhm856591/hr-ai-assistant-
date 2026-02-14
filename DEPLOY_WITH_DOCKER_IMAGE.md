# Quick Deploy with Docker Hub Image

This guide shows how to deploy the AI Recruiter using the pre-built Docker image from Docker Hub.

## Prerequisites
- Docker and Docker Compose installed
- `.env` file with your Vapi credentials

## Quick Start

### 1. Create Environment File

```bash
# Create .env file
cat > .env << EOF
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VAPI_API_KEY=your_vapi_api_key_here
EOF
```

### 2. Create Storage Directories

```bash
mkdir -p storage/recordings storage/feedback
```

### 3. Deploy with Docker Compose

```bash
# Pull latest image and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 4. Access the Application

Open your browser and go to:
- **Local**: http://localhost:3000
- **Network**: http://your-server-ip:3000

## Management Commands

### Update to Latest Version
```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Restart with new image
docker-compose -f docker-compose.prod.yml up -d
```

### View Logs
```bash
# Follow logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Stop/Start
```bash
# Stop
docker-compose -f docker-compose.prod.yml stop

# Start
docker-compose -f docker-compose.prod.yml start

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### Remove Everything
```bash
# Stop and remove containers (keeps volumes)
docker-compose -f docker-compose.prod.yml down

# Remove containers and volumes (deletes recordings!)
docker-compose -f docker-compose.prod.yml down -v
```

## Update Interview Script

You can update the interview script without rebuilding:

```bash
# Edit instruction.md
nano instruction.md

# Restart to apply changes
docker-compose -f docker-compose.prod.yml restart
```

## Production Deployment

### On a VPS/Cloud Server

1. **Install Docker**:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

2. **Clone or Download Files**:
```bash
# Option 1: Clone repo
git clone https://github.com/yourusername/ai-recruiter.git
cd ai-recruiter

# Option 2: Download just the compose file
wget https://raw.githubusercontent.com/yourusername/ai-recruiter/main/docker-compose.prod.yml
wget https://raw.githubusercontent.com/yourusername/ai-recruiter/main/instruction.md
```

3. **Configure Environment**:
```bash
# Create .env file
nano .env
# Add your Vapi keys

# Create storage
mkdir -p storage/recordings storage/feedback
```

4. **Deploy**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

5. **Setup Firewall** (if needed):
```bash
# Allow port 3000
sudo ufw allow 3000/tcp
```

## Using with Nginx Reverse Proxy

Create nginx config:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then:
```bash
sudo systemctl reload nginx
```

## Environment Variables

Required:
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY` - Your Vapi public key
- `VAPI_API_KEY` - Your Vapi API key

Optional:
- `NODE_ENV` - Set to `production` (default)

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if port 3000 is already in use
sudo lsof -i :3000
```

### Can't access from network
```bash
# Check firewall
sudo ufw status

# Allow port 3000
sudo ufw allow 3000/tcp
```

### Out of disk space
```bash
# Check storage usage
docker system df

# Clean up old images
docker image prune -a

# Check recordings size
du -sh storage/recordings/
```

### Update not working
```bash
# Force pull new image
docker-compose -f docker-compose.prod.yml pull --no-cache

# Remove old container and recreate
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

## Monitoring

### Check Health
```bash
# Container health status
docker ps

# Application health
curl http://localhost:3000
```

### Resource Usage
```bash
# Real-time stats
docker stats ai-recruiter

# Disk usage
docker system df -v
```

## Backup

### Manual Backup
```bash
# Backup recordings
tar czf backup-$(date +%Y%m%d).tar.gz storage/

# Copy to safe location
scp backup-*.tar.gz user@backup-server:/backups/
```

### Automated Backup (Cron)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/ai-recruiter && tar czf /backups/ai-recruiter-$(date +\%Y\%m\%d).tar.gz storage/
```

## Security Best Practices

1. **Don't expose port 3000 directly** - Use Nginx reverse proxy
2. **Use HTTPS** - Setup SSL with Let's Encrypt
3. **Restrict access** - Use firewall rules or VPN
4. **Regular updates** - Pull latest image weekly
5. **Backup regularly** - Daily backups to external storage
6. **Monitor logs** - Check for suspicious activity

## Support

For issues:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify environment variables in `.env`
3. Ensure storage directories exist and are writable
4. Check Docker Hub for latest image: https://hub.docker.com/r/rahamtullahsheikh/ai-recruiter
