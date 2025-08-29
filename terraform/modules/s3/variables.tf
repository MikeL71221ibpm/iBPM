# modules/s3/variables.tf - Variables for S3 module

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket (if empty, will be generated)"
  type        = string
  default     = ""
}

variable "enable_versioning" {
  description = "Enable versioning for S3 bucket"
  type        = bool
  default     = true
}

variable "allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

# CloudFront configuration
variable "create_cloudfront_oai" {
  description = "Create CloudFront Origin Access Identity"
  type        = bool
  default     = false
}

variable "create_cloudfront_distribution" {
  description = "Create CloudFront distribution"
  type        = bool
  default     = false
}
