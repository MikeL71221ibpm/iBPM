# Docker Deployment Guide - HRSN Behavioral Health Analytics Platform

## Overview
This guide provides comprehensive instructions for deploying the HRSN Behavioral Health Analytics Platform using Docker containers.

## Prerequisites
- Docker Engine 20.10+ 
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- 20GB+ disk space for data storage

## Quick Start

### 1. Environment Configuration
```bash
# Copy and customize environment variables
cp .env.example .env

# Edit .env file with your specific configuration
nano .env
```

### 2. Production Deployment
```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 3. Development Setup
```bash
# Use development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Access development tools:
# - Application: http://localhost:5001
# - PgAdmin: http://localhost:8080
# - Redis Commander: http://localhost:8081
# - Mailhog: http://localhost:8025
```

## Service Architecture

### Core Services
- **app**: Main Node.js application (React + Express)
- **postgres**: PostgreSQL 16 database
- **redis**: Redis for session storage and caching
- **nginx**: Reverse proxy and load balancer (optional)

### Development Services
- **pgadmin**: Database administration interface
- **redis-commander**: Redis management interface
- **mailhog**: Email testing service

## Configuration Details

### Environment Variables
Key configuration options in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
POSTGRES_DB=hrsn_analytics
POSTGRES_USER=hrsn_user
POSTGRES_PASSWORD=secure_password

# Application
NODE_ENV=production
SESSION_SECRET=your-secure-session-secret

# External Services
STRIPE_SECRET_KEY=sk_live_your_stripe_key
SENDGRID_API_KEY=SG.your_sendgrid_key
OPENAI_API_KEY=sk-your_openai_key
```

### Volume Management
Persistent data is stored in Docker volumes:
- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `uploads_data`: User uploads and generated reports
- `logs_data`: Application and nginx logs

## Database Setup

### Initial Migration
```bash
# Run database migrations
docker-compose exec app npm run db:push

# Check database health
docker-compose exec postgres psql -U hrsn_user -d hrsn_analytics -c "SELECT health_check();"
```

### Backup and Restore
```bash
# Create backup
docker-compose exec postgres pg_dump -U hrsn_user hrsn_analytics > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U hrsn_user hrsn_analytics < backup.sql
```

## SSL/HTTPS Configuration

### Using Let's Encrypt
1. Update `nginx.conf` with your domain
2. Obtain certificates:
   ```bash
   # Install certbot
   sudo apt install certbot

   # Get certificates
   sudo certbot certonly --standalone -d your-domain.com

   # Copy certificates to ssl directory
   sudo cp /etc/letsencrypt/live/your-domain.com/* ./ssl/
   ```

3. Uncomment HTTPS configuration in `nginx.conf`
4. Restart nginx: `docker-compose restart nginx`

## Performance Optimization

### Resource Limits
Services are configured with resource limits:
- **app**: 2GB RAM, 1 CPU core
- **postgres**: Auto-scaling based on available memory
- **redis**: 512MB RAM limit

### Scaling
```bash
# Scale application instances
docker-compose up -d --scale app=3

# Monitor resource usage
docker stats
```

## Monitoring and Logging

### Log Management
```bash
# View live logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# Export logs
docker-compose logs app > app-logs.txt
```

### Health Checks
All services include health checks:
```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:5000/api/health
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service logs
docker-compose logs service-name

# Restart specific service
docker-compose restart service-name

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U hrsn_user

# Reset database
docker-compose down
docker volume rm $(docker volume ls -q | grep postgres)
docker-compose up -d
```

#### File Upload Issues
```bash
# Check upload directory permissions
docker-compose exec app ls -la uploads/

# Fix permissions
docker-compose exec app chown -R nextjs:nodejs uploads/
```

### Performance Issues
```bash
# Monitor container resources
docker stats

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Backup Strategy

### Automated Backups
Create a backup script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
docker-compose exec postgres pg_dump -U hrsn_user hrsn_analytics | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
docker run --rm -v uploads_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Schedule with cron:
```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

## Security Considerations

### Network Security
- Services communicate on internal Docker network
- Only necessary ports exposed to host
- Nginx provides additional security layer

### Data Security
- Use strong passwords for all services
- Enable SSL/TLS for production
- Regular security updates: `docker-compose pull && docker-compose up -d`

### Access Control
- Change default passwords
- Use environment variables for secrets
- Implement proper authentication in application

## Maintenance

### Updates
```bash
# Update images
docker-compose pull

# Restart with new images
docker-compose up -d

# Clean up old images
docker image prune -a
```

### Log Rotation
Configure log rotation to prevent disk space issues:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## Support and Documentation

### Useful Commands
```bash
# Enter container shell
docker-compose exec app sh

# Copy files from container
docker-compose cp app:/app/logs/app.log ./

# Database shell
docker-compose exec postgres psql -U hrsn_user hrsn_analytics

# Redis CLI
docker-compose exec redis redis-cli
```

### Monitoring Endpoints
- Application health: `http://localhost:5000/api/health`
- Database stats: `http://localhost:5000/api/database-stats`
- Nginx status: `http://localhost/health`

For additional support, refer to the main project documentation or contact the development team.