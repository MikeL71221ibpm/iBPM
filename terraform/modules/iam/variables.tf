# modules/iam/variables.tf - Variables for IAM module

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

# Optional features
variable "enable_codedeploy" {
  description = "Whether to create CodeDeploy role"
  type        = bool
  default     = false
}

variable "enable_lambda" {
  description = "Whether to create Lambda role"
  type        = bool
  default     = false
}
