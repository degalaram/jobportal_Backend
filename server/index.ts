import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { log } from "./vite.js";

const app = express();

// CORS configuration for Vercel frontend
const allowedOrigins = [
  'https://job-portal-application-ram.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin as string)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Railway
app.get('/', (req, res) => {
  res.json({ 
    status: 'JobPortal Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/jobs', '/api/auth', '/api/courses', '/api/companies']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server Error:', err);
      res.status(500).json({ message: "Internal Server Error" });
    });

    const port = parseInt(process.env.PORT || '3000', 10);
    
    server.listen(port, '0.0.0.0', () => {
      log(`🚀 JobPortal Backend API serving on port ${port}`);
      log(`🌐 Health: http://localhost:${port}/health`);
      log(`🔗 API: http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
