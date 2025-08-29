# modules/ecr/outputs.tf - Outputs for ECR module

output "repository_url" {
  description = "URL of the main application ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "repository_arn" {
  description = "ARN of the main application ECR repository"
  value       = aws_ecr_repository.app.arn
}

output "nginx_repository_url" {
  description = "URL of the nginx ECR repository"
  value       = var.create_nginx_repo ? aws_ecr_repository.nginx[0].repository_url : null
}

output "worker_repository_url" {
  description = "URL of the worker ECR repository"
  value       = var.create_worker_repo ? aws_ecr_repository.worker[0].repository_url : null
}

output "registry_id" {
  description = "Registry ID of the ECR repositories"
  value       = aws_ecr_repository.app.registry_id
}
