# modules/ecr/main.tf - ECR repository configuration

# ECR Repository for application
resource "aws_ecr_repository" "app" {
  name                 = "${var.environment}-ibpm-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.environment}-ibpm-app"
    Environment = var.environment
    Application = "iBPM"
  }
}

# ECR Repository for nginx (if using separate container)
resource "aws_ecr_repository" "nginx" {
  count                = var.create_nginx_repo ? 1 : 0
  name                 = "${var.environment}-ibpm-nginx"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.environment}-ibpm-nginx"
    Environment = var.environment
    Application = "iBPM"
  }
}

# ECR Repository for background workers (if needed)
resource "aws_ecr_repository" "worker" {
  count                = var.create_worker_repo ? 1 : 0
  name                 = "${var.environment}-ibpm-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.environment}-ibpm-worker"
    Environment = var.environment
    Application = "iBPM"
  }
}

# ECR Lifecycle Policy for app repository
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Lifecycle Policy for nginx repository
resource "aws_ecr_lifecycle_policy" "nginx" {
  count      = var.create_nginx_repo ? 1 : 0
  repository = aws_ecr_repository.nginx[0].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Lifecycle Policy for worker repository
resource "aws_ecr_lifecycle_policy" "worker" {
  count      = var.create_worker_repo ? 1 : 0
  repository = aws_ecr_repository.worker[0].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
