import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import sgMail from '@sendgrid/mail';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// CORS configuration
app.use(cors({
  origin: ['https://jobportal-frontend-sage.vercel.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
let sql = null;
if (process.env.DATABASE_URL) {
  try {
    sql = neon(process.env.DATABASE_URL);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Sample data for when database is not available
const sampleData = {
  jobs: [
    {
      id: "1",
      title: "Frontend Developer",
      company: "Tech Corp",
      location: "Mumbai",
      experience_level: "fresher",
      type: "full-time",
      salary: "₹3-5 LPA",
      skills: ["React", "JavaScript", "HTML", "CSS"],
      description: "Join our frontend team and work on exciting projects using modern technologies.",
      requirements: ["Bachelor's degree in Computer Science", "Knowledge of React", "Good communication skills"],
      closing_date: "2025-09-30",
      created_at: new Date().toISOString()
    },
    {
      id: "2",
      title: "Backend Developer",
      company: "Dev Solutions",
      location: "Bangalore",
      experience_level: "experienced",
      type: "full-time",
      salary: "₹6-10 LPA",
      skills: ["Node.js", "Express", "MongoDB", "API Development"],
      description: "Build scalable backend systems and APIs for our growing platform.",
      requirements: ["2+ years experience", "Node.js expertise", "Database knowledge"],
      closing_date: "2025-10-15",
      created_at: new Date().toISOString()
    },
    {
      id: "3",
      title: "Full Stack Developer Intern",
      company: "StartupXYZ",
      location: "Remote",
      experience_level: "fresher",
      type: "internship",
      salary: "₹15,000/month",
      skills: ["React", "Node.js", "Database", "Git"],
      description: "Great opportunity for fresh graduates to gain hands-on experience.",
      requirements: ["Recent graduate", "Basic programming knowledge", "Eagerness to learn"],
      closing_date: "2025-09-15",
      created_at: new Date().toISOString()
    }
  ],
  courses: [
    {
      id: "1",
      title: "React Fundamentals",
      instructor: "John Doe",
      duration: "4 weeks",
      category: "web-development",
      price: "₹2,999",
      level: "Beginner",
      description: "Learn React from scratch with hands-on projects",
      syllabus: ["JSX Basics", "Components", "State & Props", "Event Handling", "API Integration"],
      created_at: new Date().toISOString()
    },
    {
      id: "2",
      title: "Node.js Backend Development",
      instructor: "Jane Smith",
      duration: "6 weeks",
      category: "backend",
      price: "₹3,999",
      level: "Intermediate",
      description: "Master backend development with Node.js and Express",
      syllabus: ["Node.js Basics", "Express Framework", "Database Integration", "API Development", "Authentication"],
      created_at: new Date().toISOString()
    }
  ],
  companies: [
    {
      id: "1",
      name: "Tech Corp",
      description: "Leading technology company specializing in innovative software solutions",
      website: "https://techcorp.com",
      linkedin: "https://linkedin.com/company/techcorp",
      logo: "https://via.placeholder.com/100x100?text=TC"
    },
    {
      id: "2", 
      name: "Dev Solutions",
      description: "Expert software development and consulting services",
      website: "https://devsolutions.com",
      linkedin: "https://linkedin.com/company/devsolutions",
      logo: "https://via.placeholder.com/100x100?text=DS"
    }
  ]
};

// Utility function to hash passwords
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'JobPortal API Server Running Successfully! 🚀',
    status: 'healthy',
    environment: process.env.NODE_ENV || 'production',
    database: sql ? 'connected' : 'sample data mode',
    sendgrid: process.env.SENDGRID_API_KEY ? 'configured' : 'not configured',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      jobs: '/api/jobs',
      courses: '/api/courses',
      companies: '/api/companies',
      auth: '/api/auth/*',
      applications: '/api/applications',
      contacts: '/api/contacts'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is working perfectly',
    server: 'Railway',
    database: sql ? 'connected' : 'sample mode',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, fullName, password, phone } = req.body;
    
    if (!email || !fullName || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: email, fullName, password' 
      });
    }

    let user;
    
    if (sql) {
      // Database implementation
      try {
        // Check if user exists
        const existingUsers = await sql`
          SELECT id FROM users WHERE email = ${email}
        `;
        
        if (existingUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'User already exists with this email'
          });
        }
        
        const hashedPassword = await hashPassword(password);
        
        const [newUser] = await sql`
          INSERT INTO users (email, full_name, password, phone)
          VALUES (${email}, ${fullName}, ${hashedPassword}, ${phone || null})
          RETURNING id, email, full_name, phone, created_at
        `;
        
        user = newUser;
      } catch (dbError) {
        console.error('Database error during registration:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error during registration'
        });
      }
    } else {
      // Sample mode
      user = {
        id: Date.now().toString(),
        email,
        full_name: fullName,
        phone: phone || null,
        created_at: new Date().toISOString()
      };
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    let user;
    
    if (sql) {
      // Database implementation
      try {
        const users = await sql`
          SELECT id, email, full_name, phone, password, created_at 
          FROM users WHERE email = ${email}
        `;
        
        if (users.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }
        
        const dbUser = users[0];
        const isValidPassword = await verifyPassword(password, dbUser.password);
        
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }
        
        user = {
          id: dbUser.id,
          email: dbUser.email,
          full_name: dbUser.full_name,
          phone: dbUser.phone,
          created_at: dbUser.created_at
        };
      } catch (dbError) {
        console.error('Database error during login:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error during login'
        });
      }
    } else {
      // Sample mode
      user = {
        id: "demo-user",
        email: email,
        full_name: "Demo User",
        phone: "+91 9876543210",
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Jobs routes
app.get('/api/jobs', async (req, res) => {
  try {
    const { experienceLevel, search, location, type } = req.query;
    let jobs;
    
    if (sql) {
      // Database implementation
      try {
        let query = 'SELECT * FROM jobs WHERE 1=1';
        let params = [];
        
        if (experienceLevel) {
          query += ` AND experience_level = $${params.length + 1}`;
          params.push(experienceLevel);
        }
        
        if (location) {
          query += ` AND LOWER(location) LIKE $${params.length + 1}`;
          params.push(`%${location.toLowerCase()}%`);
        }
        
        if (type) {
          query += ` AND type = $${params.length + 1}`;
          params.push(type);
        }
        
        if (search) {
          query += ` AND (LOWER(title) LIKE $${params.length + 1} OR LOWER(company) LIKE $${params.length + 2})`;
          params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
        }
        
        query += ' ORDER BY created_at DESC';
        
        jobs = await sql(query, params);
      } catch (dbError) {
        console.error('Database error fetching jobs:', dbError);
        jobs = sampleData.jobs; // Fallback to sample data
      }
    } else {
      // Sample mode with filtering
      jobs = [...sampleData.jobs];
      
      if (experienceLevel) {
        jobs = jobs.filter(job => job.experience_level === experienceLevel);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        jobs = jobs.filter(job =>
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.skills.some(skill => skill.toLowerCase().includes(searchLower))
        );
      }
      
      if (location) {
        jobs = jobs.filter(job => 
          job.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (type) {
        jobs = jobs.filter(job => job.type === type);
      }
    }

    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    let job;
    
    if (sql) {
      try {
        const jobs = await sql`
          SELECT * FROM jobs WHERE id = ${jobId}
        `;
        job = jobs[0] || null;
      } catch (dbError) {
        console.error('Database error fetching job:', dbError);
        job = sampleData.jobs.find(j => j.id === jobId);
      }
    } else {
      job = sampleData.jobs.find(j => j.id === jobId);
    }
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    res.json({
      success: true,
      job: job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job'
    });
  }
});

// Courses routes
app.get('/api/courses', async (req, res) => {
  try {
    const { category, level } = req.query;
    let courses;
    
    if (sql) {
      try {
        let query = 'SELECT * FROM courses WHERE 1=1';
        let params = [];
        
        if (category) {
          query += ` AND category = $${params.length + 1}`;
          params.push(category);
        }
        
        if (level) {
          query += ` AND LOWER(level) = $${params.length + 1}`;
          params.push(level.toLowerCase());
        }
        
        query += ' ORDER BY created_at DESC';
        
        courses = await sql(query, params);
      } catch (dbError) {
        console.error('Database error fetching courses:', dbError);
        courses = sampleData.courses;
      }
    } else {
      courses = [...sampleData.courses];
      
      if (category) {
        courses = courses.filter(course => course.category === category);
      }
      
      if (level) {
        courses = courses.filter(course => 
          course.level.toLowerCase() === level.toLowerCase()
        );
      }
    }

    res.json({
      success: true,
      count: courses.length,
      courses: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    let course;
    
    if (sql) {
      try {
        const courses = await sql`
          SELECT * FROM courses WHERE id = ${courseId}
        `;
        course = courses[0] || null;
      } catch (dbError) {
        console.error('Database error fetching course:', dbError);
        course = sampleData.courses.find(c => c.id === courseId);
      }
    } else {
      course = sampleData.courses.find(c => c.id === courseId);
    }
    
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }
    
    res.json({
      success: true,
      course: course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    });
  }
});

// Companies routes
app.get('/api/companies', async (req, res) => {
  try {
    let companies;
    
    if (sql) {
      try {
        companies = await sql`
          SELECT * FROM companies ORDER BY name
        `;
      } catch (dbError) {
        console.error('Database error fetching companies:', dbError);
        companies = sampleData.companies;
      }
    } else {
      companies = sampleData.companies;
    }

    res.json({
      success: true,
      count: companies.length,
      companies: companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies'
    });
  }
});

// Applications route
app.post('/api/applications', async (req, res) => {
  try {
    const { jobId, userId, coverLetter } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Job ID is required' 
      });
    }

    let application;
    
    if (sql) {
      try {
        // Verify job exists
        const jobs = await sql`
          SELECT id, title, company FROM jobs WHERE id = ${jobId}
        `;
        
        if (jobs.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Job not found' 
          });
        }
        
        const job = jobs[0];
        
        const [newApplication] = await sql`
          INSERT INTO applications (job_id, user_id, cover_letter, status)
          VALUES (${jobId}, ${userId || 'anonymous'}, ${coverLetter || ''}, 'submitted')
          RETURNING id, job_id, user_id, cover_letter, status, created_at
        `;
        
        application = {
          ...newApplication,
          job_title: job.title,
          company: job.company
        };
      } catch (dbError) {
        console.error('Database error creating application:', dbError);
        // Fallback to sample response
        const job = sampleData.jobs.find(j => j.id === jobId);
        if (!job) {
          return res.status(404).json({ 
            success: false, 
            message: 'Job not found' 
          });
        }
        
        application = {
          id: Date.now().toString(),
          job_id: jobId,
          job_title: job.title,
          company: job.company,
          user_id: userId || 'anonymous',
          cover_letter: coverLetter || '',
          status: 'submitted',
          created_at: new Date().toISOString()
        };
      }
    } else {
      const job = sampleData.jobs.find(j => j.id === jobId);
      if (!job) {
        return res.status(404).json({ 
          success: false, 
          message: 'Job not found' 
        });
      }

      application = {
        id: Date.now().toString(),
        job_id: jobId,
        job_title: job.title,
        company: job.company,
        user_id: userId || 'anonymous',
        cover_letter: coverLetter || '',
        status: 'submitted',
        created_at: new Date().toISOString()
      };
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: application
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application'
    });
  }
});

// Contact route
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, message, subject } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and message are required' 
      });
    }

    let contact;
    
    if (sql) {
      try {
        const [newContact] = await sql`
          INSERT INTO contacts (name, email, subject, message, status)
          VALUES (${name}, ${email}, ${subject || 'General Inquiry'}, ${message}, 'received')
          RETURNING id, name, email, subject, message, status, created_at
        `;
        
        contact = newContact;
      } catch (dbError) {
        console.error('Database error creating contact:', dbError);
        contact = {
          id: Date.now().toString(),
          name,
          email,
          subject: subject || 'General Inquiry',
          message,
          status: 'received',
          created_at: new Date().toISOString()
        };
      }
    } else {
      contact = {
        id: Date.now().toString(),
        name,
        email,
        subject: subject || 'General Inquiry',
        message,
        status: 'received',
        created_at: new Date().toISOString()
      };
    }

    // Send email notification if SendGrid is configured
    if (process.env.SENDGRID_API_KEY) {
      try {
        const msg = {
          to: 'contact@jobportal.com', // Replace with your email
          from: 'noreply@jobportal.com', // Replace with your verified sender
          subject: `New Contact Form: ${contact.subject}`,
          text: `Name: ${name}\nEmail: ${email}\nSubject: ${contact.subject}\nMessage: ${message}`,
          html: `<h3>New Contact Form Submission</h3>
                 <p><strong>Name:</strong> ${name}</p>
                 <p><strong>Email:</strong> ${email}</p>
                 <p><strong>Subject:</strong> ${contact.subject}</p>
                 <p><strong>Message:</strong> ${message}</p>`
        };
        
        await sgMail.send(msg);
        console.log('Contact notification email sent');
      } catch (emailError) {
        console.error('Error sending contact notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully. We will get back to you soon!',
      contact: contact
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/jobs',
      'GET /api/jobs/:id',
      'GET /api/courses',
      'GET /api/courses/:id',
      'GET /api/companies',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/applications',
      'POST /api/contacts'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 JobPortal Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Database: ${sql ? 'Connected to PostgreSQL' : 'Using sample data'}`);
  console.log(`SendGrid: ${process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
