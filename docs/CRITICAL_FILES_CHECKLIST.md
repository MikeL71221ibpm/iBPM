# 🔥 CRITICAL FILES CHECKLIST FOR DEVELOPERS

## Must-Review Files (Start Here)

### 📋 Project Overview
- [ ] `replit.md` - **READ FIRST** - Project preferences, user requirements, coding standards
- [ ] `DEVELOPER_GUIDE.md` - This comprehensive guide
- [ ] `package.json` - Dependencies and scripts

### 🚨 Daily Reports Service (New Feature - Revenue Driver)
- [ ] `client/src/pages/daily-reports-page-controlling-file-08_12_25.tsx` - Main UI
- [ ] `server/routes/daily-reports.ts` - **CRITICAL** - Contains Excel bug fix
- [ ] `server/services/report-generator.ts` - PDF generation
- [ ] `server/services/chart-generator.ts` - Chart rendering

### 🏗️ Core Application 
- [ ] `client/src/App.tsx` - Application router
- [ ] `server/index.ts` - Server entry point  
- [ ] `shared/schema.ts` - Database structure
- [ ] `client/src/pages/themed-visualization-fixed-new.tsx` - Main analytics

### 🔧 Configuration Files
- [ ] `.env.example` - Required environment variables
- [ ] `drizzle.config.ts` - Database configuration
- [ ] `vite.config.ts` - Frontend build setup

## ⚠️ Known Issues to Address

### 1. Excel Processing (FIXED in v3.6.3)
**File**: `server/routes/daily-reports.ts`  
**Issue**: Was `import * as xlsx` - **Fixed to** `import XLSX from 'xlsx'`

### 2. Performance Bottlenecks
**Files to Optimize**:
- `server/services/report-generator.ts` - PDF generation (1-2 min)
- `server/services/chart-generator.ts` - Chart rendering 

### 3. Scalability Concerns
**Consider Adding**:
- Background job processing
- Chart caching mechanism
- Database connection pooling
- Redis for sessions

## 💡 Quick Start Commands

```bash
# Development
npm install
npm run db:push
npm run dev

# Production  
npm run build
npm start

# Database
npm run db:studio  # View database
```

## 🎯 Improvement Priorities

1. **HIGH**: Background PDF generation
2. **HIGH**: Chart caching system  
3. **MEDIUM**: Comprehensive error handling
4. **MEDIUM**: Unit test coverage
5. **LOW**: API documentation

## 📞 Emergency Contacts

- **Excel Upload Issues**: Check `server/routes/daily-reports.ts` XLSX import
- **PDF Generation Failures**: Review `server/services/report-generator.ts`
- **Database Problems**: Verify `shared/schema.ts` and connection
- **Chart Rendering Issues**: Check `server/services/chart-generator.ts`

---
**Last Updated**: August 15, 2025 - v3.6.3 Daily Reports Release