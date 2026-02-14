# Deploy AI Recruiter on VM - Complete Guide

This guide covers deploying the AI Recruiter application on a Virtual Machine (AWS EC2, Google Cloud, DigitalOcean, Azure, etc.)

## Prerequisites

- A VM with Ubuntu 20.04+ or Debian 11+
- SSH access to the VM
- Domain name (optional, for production)
- Vapi API keys

---

## Step 1: Prepare Your VM

### 1.1 Connect to Your VM

```bash
# SSH into your VM
ssh username@your-vm-ip

# Or if using a key file
ssh -i /path/to/key.pem ubuntu@your-vm-ip
```

### 1.2 Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nano ufw
```

---

## Step 2: Install Docker

### 2.1 Install Docker Engine

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run installation script
sudo sh get-docker.sh

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Apply group changes (or logout and login again)
newgrp docker

# Verify installation
docker --version
```

### 2.2 Install Docker Compose

```bash
# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify installation
docker compose version
```

---

## Step 3: Setup Firewall

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port
sudo ufw allow 3000/tcp

# Check status
sudo ufw status
```

---

## Step 4: Deploy the Application

### Option A: Using Docker Hub Image (Recommended - Fastest)

#### 4.1 Create Project Directory

```bash
# Create directory
mkdir -p ~/ai-recruiter
cd ~/ai-recruiter

# Create storage directories
mkdir -p storage/recordings storage/feedback
```

#### 4.2 Download Required Files

```bash
# Download docker-compose file
wget https://raw.githubusercontent.com/yourusername/ai-recruiter/main/docker-compose.prod.yml

# Download instruction.md
wget https://raw.githubusercontent.com/yourusername/ai-recruiter/main/instruction.md

# Or if you have the files locally, upload them:
# scp docker-compose.prod.yml username@your-vm-ip:~/ai-recruiter/
# scp instruction.md username@your-vm-ip:~/ai-recruiter/
```

#### 4.3 Create Environment File

```bash
# Create .env file
nano .env
```

Add your Vapi credentials:
```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VAPI_API_KEY=your_vapi_api_key_here
```

Save and exit (Ctrl+X, then Y, then Enter)

#### 4.4 Deploy

```bash
# Pull and start the application
docker compose -f docker-compose.prod.yml up -d

# Check if it's running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Option B: Clone and Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/ai-recruiter.git
cd ai-recruiter

# Create .env file
nano .env
# Add your Vapi keys

# Create storage directories
mkdir -p storage/recordings storage/feedback

# Build and start
docker compose up -d --build

# View logs
docker compose logs -f
```

---

## Step 5: Verify Deployment

### 5.1 Check Application

```bash
# Check if container is running
docker ps

# Test locally
curl http://localhost:3000

# Check logs
docker compose -f docker-compose.prod.yml logs --tail=50
```

### 5.2 Access from Browser

Open your browser and go to:
- `http://your-vm-ip:3000`

---

## Step 6: Setup Domain and SSL (Production)

### 6.1 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6.2 Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/ai-recruiter
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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
        
        # Increase timeouts for long interviews
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

Enable the site:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ai-recruiter /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6.3 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts and enter your email

# Test auto-renewal
sudo certbot renew --dry-run
```

Now access your app at: `https://your-domain.com`

---

## Step 7: Setup Auto-Start on Boot

```bash
# Docker containers with restart: unless-stopped will auto-start
# Verify restart policy
docker inspect ai-recruiter | grep -A 5 RestartPolicy

# If needed, update restart policy
docker update --restart=unless-stopped ai-recruiter
```

---

## Step 8: Monitoring and Maintenance

### 8.1 View Logs

```bash
# Real-time logs
docker compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Specific service logs
docker logs ai-recruiter -f
```

### 8.2 Check Resource Usage

```bash
# Container stats
docker stats ai-recruiter

# Disk usage
df -h
du -sh ~/ai-recruiter/storage/*

# System resources
htop  # or: top
```

### 8.3 Update Application

```bash
cd ~/ai-recruiter

# Pull latest image
docker compose -f docker-compose.prod.yml pull

# Restart with new image
docker compose -f docker-compose.prod.yml up -d

# Or force recreate
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### 8.4 Backup Recordings

```bash
# Manual backup
tar czf backup-$(date +%Y%m%d).tar.gz storage/

# Copy to local machine
scp username@your-vm-ip:~/ai-recruiter/backup-*.tar.gz ./

# Or setup automated backups (see STORAGE_MANAGEMENT.md)
```

---

## Step 9: Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check if port is in use
sudo lsof -i :3000

# Restart Docker
sudo systemctl restart docker
```

### Can't access from browser

```bash
# Check firewall
sudo ufw status

# Check if app is listening
sudo netstat -tlnp | grep 3000

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Clean old recordings
find ~/ai-recruiter/storage/recordings -mtime +90 -delete
```

### SSL certificate issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Step 10: Security Best Practices

### 10.1 Secure SSH

```bash
# Disable password authentication (use keys only)
sudo nano /etc/ssh/sshd_config

# Set: PasswordAuthentication no
# Save and restart SSH
sudo systemctl restart sshd
```

### 10.2 Setup Fail2Ban

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 10.3 Regular Updates

```bash
# Create update script
cat > ~/update.sh << 'EOF'
#!/bin/bash
sudo apt update
sudo apt upgrade -y
docker compose -f ~/ai-recruiter/docker-compose.prod.yml pull
docker compose -f ~/ai-recruiter/docker-compose.prod.yml up -d
EOF

chmod +x ~/update.sh

# Run weekly via cron
crontab -e
# Add: 0 2 * * 0 ~/update.sh >> ~/update.log 2>&1
```

---

## Quick Reference Commands

```bash
# Start application
docker compose -f docker-compose.prod.yml up -d

# Stop application
docker compose -f docker-compose.prod.yml down

# Restart application
docker compose -f docker-compose.prod.yml restart

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Update to latest version
docker compose -f docker-compose.prod.yml pull && \
docker compose -f docker-compose.prod.yml up -d

# Backup data
tar czf backup-$(date +%Y%m%d).tar.gz storage/

# Check status
docker compose -f docker-compose.prod.yml ps
docker stats ai-recruiter
```

---

## Cost Optimization Tips

1. **Choose right VM size**: 2 vCPU, 4GB RAM is sufficient for moderate load
2. **Use reserved instances**: Save 30-70% on cloud costs
3. **Setup auto-scaling**: Scale based on demand
4. **Monitor usage**: Use cloud provider's monitoring tools
5. **Cleanup old recordings**: Implement retention policy

---

## Popular Cloud Providers Setup

### AWS EC2
- Instance type: t3.medium (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- Security group: Allow ports 22, 80, 443, 3000

### Google Cloud Compute Engine
- Machine type: e2-medium (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- Firewall: Allow tcp:22,80,443,3000

### DigitalOcean Droplet
- Size: Basic ($24/mo - 2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- Firewall: Allow SSH, HTTP, HTTPS, 3000

### Azure Virtual Machine
- Size: Standard_B2s (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- NSG: Allow ports 22, 80, 443, 3000

---

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Check firewall rules
4. Review Nginx configuration (if using)
5. Check disk space: `df -h`

Your application should now be running on your VM! 🚀
