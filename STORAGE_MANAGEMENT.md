# Storage Management Guide

## 📁 Storage Structure

```
storage/
├── recordings/          # Interview video recordings
│   └── interview_1234567890.webm
└── feedback/           # Interview feedback and analysis
    └── feedback_1234567890.json
```

## 🎥 Video Storage

### Local Development
Videos are saved to `./storage/recordings/` on your local machine.

### Docker Deployment
Videos are persisted using Docker volumes:
- **Development**: `./storage/recordings` (bind mount)
- **Production**: Named volume `recordings`

### Accessing Recordings

#### Local/Development
```bash
ls -lh storage/recordings/
```

#### Docker
```bash
# List recordings
docker exec ai-recruiter ls -lh /app/storage/recordings

# Copy recording from container to host
docker cp ai-recruiter:/app/storage/recordings/interview_123.webm ./

# Copy all recordings
docker cp ai-recruiter:/app/storage/recordings ./backup/
```

## 💾 Backup Strategy

### Manual Backup

#### Local
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Copy recordings
cp -r storage/recordings/* backups/$(date +%Y%m%d)/
cp -r storage/feedback/* backups/$(date +%Y%m%d)/
```

#### Docker
```bash
# Backup recordings volume
docker run --rm \
  -v ai-recruiter_recordings:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/recordings-$(date +%Y%m%d).tar.gz -C /data .

# Backup feedback volume
docker run --rm \
  -v ai-recruiter_feedback:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/feedback-$(date +%Y%m%d).tar.gz -C /data .
```

### Automated Backup (Cron)

Create a backup script:

```bash
#!/bin/bash
# backup-storage.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup recordings
docker run --rm \
  -v ai-recruiter_recordings:/data \
  -v "$BACKUP_DIR/$DATE":/backup \
  alpine tar czf /backup/recordings.tar.gz -C /data .

# Backup feedback
docker run --rm \
  -v ai-recruiter_feedback:/data \
  -v "$BACKUP_DIR/$DATE":/backup \
  alpine tar czf /backup/feedback.tar.gz -C /data .

# Keep only last 30 days
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-storage.sh >> /var/log/ai-recruiter-backup.log 2>&1
```

## ☁️ Cloud Storage Integration

### Option 1: AWS S3 (Recommended for Production)

Update `docker-compose.yml`:
```yaml
services:
  ai-recruiter:
    environment:
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET_NAME=ai-recruiter-recordings
```

See `S3_INSTRUCTIONS.md` for full implementation.

### Option 2: Sync to Cloud Storage

#### AWS S3
```bash
# Install AWS CLI
# Sync recordings to S3
aws s3 sync storage/recordings/ s3://your-bucket/recordings/
aws s3 sync storage/feedback/ s3://your-bucket/feedback/
```

#### Google Cloud Storage
```bash
# Install gcloud CLI
gsutil -m rsync -r storage/recordings/ gs://your-bucket/recordings/
gsutil -m rsync -r storage/feedback/ gs://your-bucket/feedback/
```

#### Azure Blob Storage
```bash
# Install Azure CLI
az storage blob upload-batch \
  --destination recordings \
  --source storage/recordings/ \
  --account-name youraccount
```

## 📊 Storage Monitoring

### Check Storage Usage

#### Local
```bash
du -sh storage/recordings/
du -sh storage/feedback/
```

#### Docker
```bash
# Check volume size
docker system df -v | grep recordings

# Detailed inspection
docker exec ai-recruiter du -sh /app/storage/*
```

### Cleanup Old Recordings

```bash
# Delete recordings older than 90 days
find storage/recordings/ -type f -mtime +90 -delete
find storage/feedback/ -type f -mtime +90 -delete
```

## 🔒 Security Considerations

### File Permissions
```bash
# Set proper permissions (local)
chmod 750 storage/
chmod 640 storage/recordings/*
chmod 640 storage/feedback/*
```

### Encryption at Rest

#### Encrypt backups
```bash
# Create encrypted backup
tar czf - storage/recordings/ | \
  openssl enc -aes-256-cbc -salt -out recordings-encrypted.tar.gz.enc

# Decrypt
openssl enc -d -aes-256-cbc -in recordings-encrypted.tar.gz.enc | \
  tar xzf -
```

## 📈 Storage Estimates

Average file sizes:
- **Video Recording**: 5-10 MB per minute
- **Feedback JSON**: 5-50 KB per interview

Example calculations:
- 10-minute interview = ~50-100 MB
- 100 interviews/day = ~5-10 GB/day
- Monthly storage = ~150-300 GB

## 🚨 Disaster Recovery

### Restore from Backup

#### Local
```bash
# Restore recordings
cp -r backups/20260214/* storage/
```

#### Docker
```bash
# Stop container
docker-compose down

# Restore recordings volume
docker run --rm \
  -v ai-recruiter_recordings:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/recordings-20260214.tar.gz -C /data

# Restore feedback volume
docker run --rm \
  -v ai-recruiter_feedback:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/feedback-20260214.tar.gz -C /data

# Start container
docker-compose up -d
```

## 📝 Best Practices

1. **Regular Backups**: Daily automated backups to external storage
2. **Cloud Sync**: Real-time or hourly sync to S3/GCS for critical data
3. **Retention Policy**: Keep recordings for 90 days, then archive or delete
4. **Monitoring**: Set up alerts for storage usage > 80%
5. **Encryption**: Encrypt sensitive recordings before backup
6. **Access Control**: Limit access to storage directories
7. **Testing**: Regularly test backup restoration process
