# Behavioral Health Analytics - Clean Deployment Instructions

## Project Overview
Complete behavioral health analytics platform with 73,925 symptoms, 2,456 patients, advanced visualizations, and real-time processing.

## Setup Instructions

### Step 1: Upload Files
1. Extract all files from deployment package
2. Upload to your new Replit project
3. Ensure folder structure: client/, server/, shared/, package.json

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Variables
Create `.env` file with these variables:

```env
# Database (Your existing Neon database)
DATABASE_URL="postgresql://username:password@hostname:port/database"

# Authentication
SESSION_SECRET="your-secure-session-secret-here"

# Stripe Payment Processing
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"

# Environment
NODE_ENV="production"
PORT="5000"
```

### Step 4: Database Connection
Your existing Neon database with all patient data will connect automatically. All 73,925 symptoms and user accounts are preserved.

### Step 5: Deploy
Click the Deploy button in your new Replit project.

## Features Included
✅ Complete authentication system (case-insensitive login)
✅ Advanced chart visualizations (Nivo, D3)
✅ Real-time WebSocket progress tracking
✅ HRSN analytics (8 categories)
✅ Export capabilities (CSV, Excel, PDF)
✅ Enhanced .gitignore (prevents future size issues)

## Size Guarantee
This clean deployment package is under 100MB (vs 12GB original) and will deploy successfully.

## Support
All functionality identical to original workspace. Database contains all existing patient data and user accounts.