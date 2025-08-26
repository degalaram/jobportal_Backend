import express from "express";
import { createServer } from "http";

const app = express();

// CORS configuration for your frontend
app.use((req, res, next) => {
  // Your actual Vercel frontend URL
  const allowedOrigins = [
    'https://job-portal-application-ram.vercel.app', // Your actual Vercel frontend URL
    'http://localhost:3000', // Local development
    'http://localhost:5000'  // Local development
  ];
  
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

// Logging middleware
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

      console.log(logLine);
    }
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Job Portal Backend is running' });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Basic Auth endpoints for testing
app.post('/api/auth/register', (req, res) => {
  console.log('Register request:', req.body);
  res.json({ 
    message: 'Registration endpoint working', 
    data: req.body,
    id: '12345',
    email: req.body.email,
    fullName: req.body.fullName
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login request:', req.body);
  res.json({ 
    message: 'Login endpoint working', 
    data: req.body,
    id: '12345',
    email: req.body.email 
  });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const server = createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Job Portal Backend server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API test: http://localhost:${port}/api/test`);
});
