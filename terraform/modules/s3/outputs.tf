# modules/s3/outputs.tf - Outputs for S3 module

output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.uploads.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.uploads.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.uploads[0].domain_name : null
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.uploads[0].id : null
}

output "cloudfront_oai_iam_arn" {
  description = "IAM ARN of the CloudFront Origin Access Identity"
  value       = var.create_cloudfront_oai ? aws_cloudfront_origin_access_identity.uploads[0].iam_arn : null
}
