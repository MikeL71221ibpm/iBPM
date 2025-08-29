# modules/security/outputs.tf - Outputs for security module

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = var.create_redis ? aws_security_group.redis[0].id : null
}

output "bastion_security_group_id" {
  description = "ID of the bastion host security group"
  value       = var.create_bastion ? aws_security_group.bastion[0].id : null
}

output "vpc_endpoint_security_group_id" {
  description = "ID of the VPC endpoint security group"
  value       = aws_security_group.vpc_endpoint.id
}
