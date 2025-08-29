# iBPM AWS Infrastructure with Terraform

This Terraform configuration creates a secure, scalable AWS infrastructure for the iBPM (Behavioral Health Analytics Platform) application.

## Architecture Overview

The infrastructure includes:

- **VPC**: Private VPC with public/private/database subnets across multiple availability zones
- **ECS**: Container orchestration using AWS Fargate for the Node.js application
- **RDS**: PostgreSQL database with encryption and automated backups
- **S3**: Secure file storage for uploads with lifecycle policies
- **Load Balancer**: Application Load Balancer with health checks
- **Security**: Comprehensive security groups and IAM roles
- **Monitoring**: CloudWatch alarms and logging
- **Auto-scaling**: CPU/memory-based scaling for ECS tasks

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Terraform** v1.0+ installed
3. **Docker** for building and pushing container images
4. **Domain** (optional) for Route53 configuration

## Quick Start

### 1. Clone and Setup

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

### 2. Configure Variables

Edit `terraform.tfvars` with your specific values:

```hcl
# Required variables
aws_region = "us-east-1"
environment = "dev"
db_password = "your-secure-database-password"
session_secret = "your-secure-session-secret"
app_image_uri = "your-ecr-repository-uri"

# Optional: Domain configuration
create_route53_records = true
domain_name = "ibpm.yourdomain.com"
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Plan Deployment

```bash
terraform plan
```

### 5. Deploy Infrastructure

```bash
terraform apply
```

## Configuration Options

### Environment Variables

The application supports the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `STRIPE_SECRET_KEY` | Stripe payment processing | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Yes |
| `SENDGRID_API_KEY` | Email service API key | Yes |
| `FROM_EMAIL` | Sender email address | Yes |
| `OPENAI_API_KEY` | AI service API key | No |
| `CORS_ORIGIN` | CORS allowed origins | No |
| `S3_BUCKET_NAME` | S3 bucket for file uploads | Yes |

### Database Configuration

The PostgreSQL database is configured with:
- **Engine**: PostgreSQL 16.3
- **Storage**: 20GB (auto-scaling to 100GB)
- **Backup**: Daily backups with 7-day retention
- **Encryption**: AES256 encryption at rest
- **Monitoring**: Enhanced monitoring enabled

### Security Features

- **VPC Isolation**: All resources in private subnets
- **Security Groups**: Least-privilege access rules
- **IAM Roles**: Minimal required permissions
- **Encryption**: Data encrypted at rest and in transit
- **HTTPS**: Optional SSL/TLS termination

## Building and Deploying the Application

### 1. Build Docker Image

```bash
# From the project root
docker build -t ibpm-app .
```

### 2. Create ECR Repository

```bash
# If not using Terraform ECR module
aws ecr create-repository --repository-name ibpm-app --region us-east-1
```

### 3. Push Image to ECR

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI

# Tag and push image
docker tag ibpm-app:latest YOUR_ECR_URI/ibpm-app:latest
docker push YOUR_ECR_URI/ibpm-app:latest
```

### 4. Update Terraform Variables

```hcl
app_image_uri = "YOUR_ECR_URI/ibpm-app:latest"
```

### 5. Deploy Updates

```bash
terraform apply
```

## Monitoring and Logging

### CloudWatch Logs

Application logs are available in CloudWatch Logs:
- **Log Group**: `/ecs/{environment}-ibpm`
- **Retention**: 30 days

### CloudWatch Alarms

Pre-configured alarms for:
- **RDS**: CPU, memory, and storage utilization
- **ECS**: CPU and memory utilization
- **ALB**: Target response time and unhealthy hosts

### Accessing Logs

```bash
# View ECS logs
aws logs tail /ecs/dev-ibpm --follow --region us-east-1

# View RDS logs
aws rds describe-db-log-files --db-instance-identifier dev-ibpm-postgres --region us-east-1
```

## Scaling Configuration

### Auto-scaling Policies

- **CPU Scaling**: Target 70% CPU utilization
- **Memory Scaling**: Target 80% memory utilization
- **Min/Max Tasks**: 1-10 tasks (configurable)

### Manual Scaling

```bash
# Scale to specific number of tasks
aws ecs update-service \
  --cluster dev-ibpm-cluster \
  --service dev-ibpm-service \
  --desired-count 5 \
  --region us-east-1
```

## Backup and Recovery

### Database Backups

- **Automated**: Daily snapshots with 7-day retention
- **Manual**: On-demand snapshots available
- **Encryption**: All backups encrypted with KMS

### Application Backups

- **S3**: File uploads with lifecycle policies
- **Container Images**: Stored in ECR with lifecycle rules

## Cost Optimization

### Reserved Instances

Consider purchasing Reserved Instances for:
- **RDS**: Database instances for production workloads
- **NAT Gateway**: For persistent traffic

### Auto-scaling

Configure appropriate scaling limits to prevent over-provisioning.

### Storage Classes

S3 lifecycle policies automatically move data to cheaper storage tiers.

## Troubleshooting

### Common Issues

1. **Container Health Checks Failing**
   ```bash
   # Check ECS service events
   aws ecs describe-services --cluster dev-ibpm-cluster --services dev-ibpm-service --region us-east-1
   ```

2. **Database Connection Issues**
   ```bash
   # Check security groups and NACLs
   aws ec2 describe-security-groups --group-ids YOUR_ECS_SG --region us-east-1
   ```

3. **Load Balancer Issues**
   ```bash
   # Check ALB target health
   aws elbv2 describe-target-health --target-group-arn YOUR_TG_ARN --region us-east-1
   ```

### Logs and Debugging

```bash
# Get ECS task logs
aws logs get-log-events --log-group-name /ecs/dev-ibpm --log-stream-name ecs/ibpm-app/YOUR_TASK_ID --region us-east-1

# Check ECS task status
aws ecs describe-tasks --cluster dev-ibpm-cluster --tasks YOUR_TASK_ARN --region us-east-1
```

## Security Best Practices

1. **Rotate Credentials**: Regularly rotate database passwords and API keys
2. **Restrict Access**: Use specific CIDR blocks instead of 0.0.0.0/0
3. **Enable Encryption**: Ensure all data is encrypted at rest and in transit
4. **Monitor Access**: Enable CloudTrail for API auditing
5. **Regular Updates**: Keep container images and dependencies updated

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review AWS documentation for specific services
3. Check CloudWatch logs for application errors
4. Verify Terraform state and configuration

## Contributing

When making changes to the infrastructure:
1. Test changes in a development environment first
2. Use `terraform plan` to review changes
3. Document any new variables or configuration options
4. Update this README with relevant changes
