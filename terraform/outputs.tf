# outputs.tf - Output values from Terraform configuration

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

# Database Outputs
output "db_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "db_port" {
  description = "RDS database port"
  value       = module.rds.db_port
}

output "db_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

# S3 Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket for file uploads"
  value       = module.s3.bucket_name
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = module.s3.bucket_domain_name
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.ecs.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.ecs.alb_zone_id
}

# ECR Outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.ecr.repository_url
}

# Route53 Outputs (conditional)
output "route53_domain_name" {
  description = "Domain name configured in Route53"
  value       = var.create_route53_records ? module.route53[0].domain_name : null
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = var.create_route53_records && var.create_cloudfront ? module.route53[0].cloudfront_domain_name : null
}

# IAM Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = module.iam.ecs_task_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = module.iam.ecs_task_role_arn
}

# Application URL
output "application_url" {
  description = "URL to access the application"
  value       = var.create_route53_records ? "https://${var.domain_name}" : "http://${module.ecs.alb_dns_name}"
}

# Database Connection String (for reference)
output "database_connection_string" {
  description = "Database connection string (use with caution)"
  value       = "postgresql://${var.db_username}:[PASSWORD]@${module.rds.db_endpoint}:${module.rds.db_port}/${module.rds.db_name}"
  sensitive   = true
}
