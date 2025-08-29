# modules/ecr/variables.tf - Variables for ECR module

variable "environment" {
  description = "Environment name"
  type        = string
}

# Optional repositories
variable "create_nginx_repo" {
  description = "Whether to create ECR repository for nginx"
  type        = bool
  default     = false
}

variable "create_worker_repo" {
  description = "Whether to create ECR repository for background workers"
  type        = bool
  default     = false
}
