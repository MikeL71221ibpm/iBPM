# main.tf - Main Terraform configuration for iBPM Behavioral Health Analytics Platform
# This file orchestrates all AWS resources for a secure, scalable deployment

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Configure backend for state management (uncomment and configure for production)
  # backend "s3" {
  #   bucket         = "ibpm-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "ibpm-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "iBPM"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Application = "Behavioral Health Analytics"
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for current AWS region
data "aws_region" "current" {}

# Import VPC module
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr             = var.vpc_cidr
  environment          = var.environment
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
}

# Import security groups
module "security" {
  source = "./modules/security"

  vpc_id              = module.vpc.vpc_id
  environment         = var.environment
  allowed_cidr_blocks = var.allowed_cidr_blocks
}

# Import IAM roles and policies
module "iam" {
  source = "./modules/iam"

  environment = var.environment
}

# Import ECR repository
module "ecr" {
  source = "./modules/ecr"

  environment = var.environment
}

# Import RDS PostgreSQL database
module "rds" {
  source = "./modules/rds"

  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  database_subnet_ids      = module.vpc.database_subnet_ids
  db_security_group_id     = module.security.db_security_group_id
  environment              = var.environment
  db_instance_class        = var.db_instance_class
  db_allocated_storage     = var.db_allocated_storage
  db_engine_version        = var.db_engine_version
  db_backup_retention      = var.db_backup_retention
  db_multi_az              = var.db_multi_az
  db_deletion_protection   = var.db_deletion_protection
}

# Import S3 bucket for file uploads
module "s3" {
  source = "./modules/s3"

  environment = var.environment
  bucket_name = var.s3_bucket_name
}

# Import ECS cluster and services
module "ecs" {
  source = "./modules/ecs"

  vpc_id                    = module.vpc.vpc_id
  public_subnet_ids         = module.vpc.public_subnet_ids
  private_subnet_ids        = module.vpc.private_subnet_ids
  alb_security_group_id     = module.security.alb_security_group_id
  ecs_security_group_id     = module.security.ecs_security_group_id
  ecs_task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  ecs_task_role_arn         = module.iam.ecs_task_role_arn
  environment               = var.environment
  app_image_uri             = var.app_image_uri
  app_port                  = var.app_port
  app_cpu                   = var.app_cpu
  app_memory                = var.app_memory
  desired_count             = var.desired_count
  max_capacity              = var.max_capacity
  min_capacity              = var.min_capacity
  cpu_target_value          = var.cpu_target_value
  memory_target_value       = var.memory_target_value

  # Database configuration
  db_host                   = module.rds.db_endpoint
  db_name                   = var.db_name
  db_username               = var.db_username
  db_password               = var.db_password

  # S3 configuration
  s3_bucket_name            = module.s3.bucket_name

  # Other environment variables
  session_secret            = var.session_secret
  stripe_secret_key         = var.stripe_secret_key
  stripe_publishable_key    = var.stripe_publishable_key
  sendgrid_api_key          = var.sendgrid_api_key
  from_email                = var.from_email
  openai_api_key            = var.openai_api_key
  cors_origin               = var.cors_origin
}

# Import Route53 and CloudFront (optional)
module "route53" {
  source = "./modules/route53"
  count  = var.create_route53_records ? 1 : 0

  domain_name         = var.domain_name
  alb_dns_name        = module.ecs.alb_dns_name
  alb_zone_id         = module.ecs.alb_zone_id
  environment         = var.environment
  create_cloudfront   = var.create_cloudfront
}

# Import monitoring (optional)
module "monitoring" {
  source = "./modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0

  environment         = var.environment
  ecs_cluster_name    = module.ecs.cluster_name
  ecs_service_name    = module.ecs.service_name
  alb_arn_suffix      = module.ecs.alb_arn_suffix
  rds_cluster_id      = module.rds.db_cluster_id
}
