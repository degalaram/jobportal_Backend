import express from 'express';

const app = express();

// CORS for your frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://job-portal-application-ram.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'JobPortal Backend is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API endpoints your frontend needs
app.get('/api/jobs', (req, res) => {
  res.json([
    {
      id: "1",
      title: "Software Developer",
      company: { name: "Accenture", location: "Bengaluru" },
      description: "Join our team",
      experienceLevel: "fresher",
      location: "Bengaluru",
      salary: "₹4-6 LPA"
    }
  ]);
});

app.get('/api/courses', (req, res) => {
  res.json([
    {
      id: "1",
      title: "Python Programming",
      description: "Learn Python basics",
      category: "programming",
      price: "₹2,999"
    }
  ]);
});

app.get('/api/companies', (req, res) => {
  res.json([
    {
      id: "1", 
      name: "Accenture",
      description: "Global IT services",
      location: "Bengaluru"
    }
  ]);
});

app.post('/api/auth/login', (req, res) => {
  res.json({ id: "1", email: "test@example.com", fullName: "Test User" });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ id: "1", email: req.body.email, fullName: req.body.fullName });
});

app.post('/api/contact', (req, res) => {
  res.json({ message: "Contact form submitted successfully" });
});

const port = parseInt(process.env.PORT || '3000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});
