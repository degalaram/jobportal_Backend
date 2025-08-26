import express, { type Request, Response, NextFunction } from "express";
import { log } from "./vite.js";

const app = express();

// CORS configuration for Vercel frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Only register routes if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      const { registerRoutes } = await import("./routes.js");
      const server = await registerRoutes(app);
      
      const port = parseInt(process.env.PORT || '5000', 10);
      server.listen(port, "0.0.0.0", () => {
        log(`🚀 JobPortal API Server with database running on port ${port}`);
      });
    } else {
      // Simple server without database
      app.get('/', (req, res) => {
        res.json({ 
          message: 'JobPortal API Server Running!', 
          status: 'healthy',
          environment: process.env.NODE_ENV || 'production',
          database: 'not configured'
        });
      });

      app.get('/api/health', (req, res) => {
        res.json({ 
          status: 'API is working',
          timestamp: new Date().toISOString()
        });
      });

      const port = parseInt(process.env.PORT || '5000', 10);
      app.listen(port, "0.0.0.0", () => {
        log(`🚀 JobPortal API Server (simple mode) running on port ${port}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    
    // Fallback simple server
    app.get('/', (req, res) => {
      res.json({ 
        message: 'JobPortal API Server Running (fallback mode)!', 
        status: 'degraded',
        error: 'Database connection failed',
        environment: process.env.NODE_ENV || 'production'
      });
    });

    const port = parseInt(process.env.PORT || '5000', 10);
    app.listen(port, "0.0.0.0", () => {
      log(`⚠️  JobPortal API Server (fallback mode) running on port ${port}`);
    });
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
})();
