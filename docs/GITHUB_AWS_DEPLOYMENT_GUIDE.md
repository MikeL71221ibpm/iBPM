# GitHub to AWS Deployment Guide
**Version**: 3.5.9  
**Date**: August 6, 2025

## 📤 Step 1: Push to GitHub

### A. Create GitHub Repository
1. Go to https://github.com
2. Click "New Repository"
3. Name it: `ibpm-healthcare-analytics`
4. Set to Private (for healthcare data security)
5. Don't initialize with README (we have one)

### B. Push Code from Your Local Machine
```bash
# Navigate to deployment package
cd deployment-package-v3.5.9-08_05_25

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "v3.5.9 - Production ready with auto-dismiss progress bar fixes"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/ibpm-healthcare-analytics.git

# Push to GitHub
git push -u origin main
```

## 🚀 Step 2: Deploy to AWS

### Option A: AWS Elastic Beanstalk (Easiest)

1. **Install EB CLI**
```bash
pip install awsebcli
```

2. **Initialize Elastic Beanstalk**
```bash
eb init -p node.js-18 ibpm-app
```

3. **Create Environment**
```bash
eb create ibpm-production
```

4. **Set Environment Variables**
```bash
eb setenv DATABASE_URL=your_postgres_url \
  STRIPE_SECRET_KEY=your_stripe_key \
  STRIPE_PUBLISHABLE_KEY=your_public_key \
  SESSION_SECRET=your_session_secret \
  NODE_ENV=production
```

5. **Deploy**
```bash
eb deploy
```

### Option B: AWS EC2 with PM2

1. **Launch EC2 Instance**
   - Choose Ubuntu 22.04
   - Select t3.medium or larger
   - Configure security groups (ports 80, 443, 22)

2. **SSH into Instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y
```

4. **Clone Repository**
```bash
git clone https://github.com/YOUR_USERNAME/ibpm-healthcare-analytics.git
cd ibpm-healthcare-analytics
```

5. **Setup Application**
```bash
# Install dependencies
npm install

# Build application
npm run build

# Create .env file
nano .env
# Add your environment variables
```

6. **Start with PM2**
```bash
pm2 start npm --name "ibpm-app" -- start
pm2 save
pm2 startup
```

7. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/default
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Option C: AWS App Runner (Simplest)

1. **Create Dockerfile** in deployment package:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

2. **Push to GitHub** (if not already done)

3. **In AWS Console**:
   - Go to App Runner
   - Create new service
   - Source: GitHub repository
   - Connect your GitHub account
   - Select repository and branch
   - Build settings: Use Dockerfile
   - Set environment variables
   - Deploy

## 🔐 Step 3: Database Setup

### Using AWS RDS PostgreSQL:
1. Create RDS PostgreSQL instance
2. Configure security groups
3. Get connection string
4. Update DATABASE_URL in your environment

### Using Neon (Simpler):
1. Keep using your existing Neon database
2. Just ensure DATABASE_URL is set in AWS environment

## ✅ Step 4: Post-Deployment

1. **Test Application**
   - Visit your AWS URL
   - Test login with BobL71221-7
   - Upload a test CSV
   - Verify extraction works

2. **Setup Domain (Optional)**
   - Route 53 for DNS
   - ACM for SSL certificate
   - CloudFront for CDN

3. **Monitor**
   - CloudWatch for logs
   - Set up alarms for errors

## 📝 Important Notes

- The deployment package at `./deployment-package-v3.5.9-08_05_25/` has everything needed
- Make sure all environment variables are set
- Database schema will auto-migrate on first run
- Uploads folder will be created automatically

## 🔑 Required Environment Variables
```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
SESSION_SECRET=your-secret-here
NODE_ENV=production
```

## 📞 Support
- Check logs: `pm2 logs` (EC2) or CloudWatch (Elastic Beanstalk)
- Database issues: Verify DATABASE_URL is correct
- Build errors: Ensure Node.js 18+ is installed