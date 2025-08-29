#!/bin/bash
# deploy.sh - Helper script for deploying iBPM infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command_exists terraform; then
        print_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi

    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi

    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Function to initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    terraform init
    print_success "Terraform initialized"
}

# Function to validate configuration
validate_config() {
    print_status "Validating Terraform configuration..."
    terraform validate
    print_success "Configuration is valid"
}

# Function to plan deployment
plan_deployment() {
    print_status "Planning deployment..."
    terraform plan -out=tfplan
    print_success "Deployment plan created"
}

# Function to apply deployment
apply_deployment() {
    print_status "Applying deployment..."
    terraform apply tfplan
    print_success "Deployment completed successfully"
}

# Function to build and push Docker image
build_and_push_image() {
    local image_uri=$1
    local region=$2

    print_status "Building Docker image..."
    docker build -t ibpm-app ../

    print_status "Authenticating with ECR..."
    aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $image_uri

    print_status "Pushing image to ECR..."
    docker tag ibpm-app:latest $image_uri
    docker push $image_uri

    print_success "Docker image pushed to ECR"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    init           Initialize Terraform
    validate       Validate Terraform configuration
    plan           Plan the deployment
    apply          Apply the deployment
    build          Build and push Docker image
    deploy         Full deployment (init + validate + plan + apply)
    destroy        Destroy the infrastructure
    help           Show this help message

Options:
    --image-uri    ECR image URI for build command
    --region       AWS region (default: us-east-1)
    --auto-approve Automatically approve Terraform operations

Examples:
    $0 init
    $0 validate
    $0 plan
    $0 apply
    $0 build --image-uri 123456789012.dkr.ecr.us-east-1.amazonaws.com/ibpm-app:latest
    $0 deploy
    $0 destroy --auto-approve

EOF
}

# Main script logic
main() {
    local command=$1
    local image_uri=""
    local region="us-east-1"
    local auto_approve=false

    # Parse command line arguments
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --image-uri)
                image_uri="$2"
                shift 2
                ;;
            --region)
                region="$2"
                shift 2
                ;;
            --auto-approve)
                auto_approve=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    case $command in
        init)
            check_prerequisites
            init_terraform
            ;;
        validate)
            validate_config
            ;;
        plan)
            plan_deployment
            ;;
        apply)
            if [[ $auto_approve == true ]]; then
                terraform apply -auto-approve
            else
                apply_deployment
            fi
            ;;
        build)
            if [[ -z $image_uri ]]; then
                print_error "Image URI is required for build command"
                echo "Use: $0 build --image-uri YOUR_ECR_URI"
                exit 1
            fi
            build_and_push_image $image_uri $region
            ;;
        deploy)
            check_prerequisites
            init_terraform
            validate_config
            plan_deployment
            if [[ $auto_approve == true ]]; then
                terraform apply -auto-approve tfplan
            else
                apply_deployment
            fi
            ;;
        destroy)
            if [[ $auto_approve == true ]]; then
                terraform destroy -auto-approve
            else
                terraform destroy
            fi
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
