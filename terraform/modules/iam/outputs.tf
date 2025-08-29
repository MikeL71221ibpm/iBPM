# modules/iam/outputs.tf - Outputs for IAM module

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

output "codedeploy_role_arn" {
  description = "ARN of the CodeDeploy role"
  value       = var.enable_codedeploy ? aws_iam_role.codedeploy[0].arn : null
}

output "lambda_role_arn" {
  description = "ARN of the Lambda role"
  value       = var.enable_lambda ? aws_iam_role.lambda[0].arn : null
}

output "ecs_task_execution_role_name" {
  description = "Name of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.name
}

output "ecs_task_role_name" {
  description = "Name of the ECS task role"
  value       = aws_iam_role.ecs_task.name
}
