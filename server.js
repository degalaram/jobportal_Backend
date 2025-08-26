import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sample data for testing
const sampleData = {
  jobs: [
    {
      id: "1",
      title: "Frontend Developer",
      company: "Tech Corp",
      location: "Mumbai",
      experienceLevel: "fresher",
      type: "full-time",
      description: "Join our frontend team and work on exciting projects."
    },
    {
      id: "2", 
      title: "Backend Developer",
      company: "Dev Solutions",
      location: "Bangalore",
      experienceLevel: "experienced",
      type: "full-time",
      description: "Build scalable backend systems."
    }
  ],
  courses: [
    {
      id: "1",
      title: "React Fundamentals",
      instructor: "John Doe",
      duration: "4 weeks",
      category: "web-development",
      description: "Learn React from scratch"
    },
    {
      id: "2",
      title: "Node.js Backend",
      instructor: "Jane Smith", 
      duration: "6 weeks",
      category: "backend",
      description: "Master backend development"
    }
  ]
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'JobPortal API Server Running Successfully! 🚀', 
    status: 'healthy',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'API is working perfectly',
    server: 'Railway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Job routes
app.get('/api/jobs', (req, res) => {
  const { experienceLevel, search } = req.query;
  let filteredJobs = sampleData.jobs;
  
  if (experienceLevel) {
    filteredJobs = filteredJobs.filter(job => job.experienceLevel === experienceLevel);
  }
  
  if (search) {
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  res.json(filteredJobs);
});

app.get('/api/jobs/:id', (req, res) => {
  const job = sampleData.jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  res.json(job);
});

// Course routes
app.get('/api/courses', (req, res) => {
  const { category } = req.query;
  let filteredCourses = sampleData.courses;
  
  if (category) {
    filteredCourses = filteredCourses.filter(course => course.category === category);
  }
  
  res.json(filteredCourses);
});

app.get('/api/courses/:id', (req, res) => {
  const course = sampleData.courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }
  res.json(course);
});

// Auth routes (mock for now)
app.post('/api/auth/register', (req, res) => {
  const { email, fullName, password } = req.body;
  
  if (!email || !fullName || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Mock user creation
  const user = {
    id: Date.now().toString(),
    email,
    fullName,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(user);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  
  // Mock login
  const user = {
    id: "demo-user",
    email: email,
    fullName: "Demo User",
    createdAt: new Date().toISOString()
  };
  
  res.json(user);
});

// Contact route
app.post('/api/contacts', (req, res) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  const contact = {
    id: Date.now().toString(),
    name,
    email,
    message,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({ message: 'Contact form submitted successfully', contact });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 JobPortal Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Time: ${new Date().toISOString()}`);
});
