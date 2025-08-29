# modules/security/variables.tf - Variables for security module

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
}

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 5000
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
  type        = string
}

# Optional Redis configuration
variable "create_redis" {
  description = "Whether to create Redis security group"
  type        = bool
  default     = false
}

# Optional Bastion host configuration
variable "create_bastion" {
  description = "Whether to create bastion host security group"
  type        = bool
  default     = false
}

variable "bastion_security_group_id" {
  description = "Security group ID of the bastion host"
  type        = string
  default     = ""
}

variable "bastion_allowed_cidrs" {
  description = "CIDR blocks allowed to access bastion host"
  type        = list(string)
  default     = []
}
