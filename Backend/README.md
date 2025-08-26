# JobPortal Backend - Railway Deployment

## What this contains:
- Express.js API server
- PostgreSQL database schema  
- All backend routes for jobs, auth, courses

## How to deploy on Railway:

1. Create new repository on GitHub with these files
2. Go to railway.app
3. Click "Deploy from GitHub"
4. Select this repository
5. Railway will automatically:
   - Create PostgreSQL database
   - Set DATABASE_URL environment variable
   - Build and deploy your backend
   - Give you a URL like: https://your-app.railway.app

## API Endpoints available:
- POST /api/auth/register - User signup
- POST /api/auth/login - User login  
- GET /api/jobs - Get all jobs
- GET /api/courses - Get all courses
- POST /api/applications - Apply for jobs
- And many more...

## Environment Variables (Auto-set by Railway):
- DATABASE_URL - PostgreSQL connection string
- PORT - Server port (auto-set by Railway)