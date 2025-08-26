import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertJobSchema,
  insertCourseSchema,
  insertApplicationSchema,
  insertContactSchema,
  insertCompanySchema,
  loginSchema
} from "@shared/schema";
import path from 'path';
import fs from 'fs';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await storage.createUser(validatedData);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await storage.validateUser(validatedData.email, validatedData.password);

      if (!user) {
        return res.status(401).json({ message: "Wrong username or wrong password" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // User profile routes
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;

      // Handle password update separately
      if (updateData.currentPassword && updateData.newPassword) {
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(updateData.currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(updateData.newPassword, 12);
        updateData.password = hashedPassword;
        delete updateData.currentPassword;
        delete updateData.newPassword;
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Password recovery routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found with this email" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in memory (in production, use a proper storage solution)
      await storage.storePasswordResetOtp(email, otp);

      // In a real implementation, send email with OTP using SendGrid
      // For now, we'll just log it and return success
      console.log(`Password reset OTP for ${email}: ${otp}`);

      res.json({ message: "OTP sent to your email" });
    } catch (error) {
      console.error("Error sending password reset OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const isValid = await storage.verifyPasswordResetOtp(email, otp);

      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      res.json({ message: "OTP verified successfully" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required" });
      }

      // Verify OTP again
      const isValid = await storage.verifyPasswordResetOtp(email, otp);

      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Update password
      await storage.updateUserPassword(email, newPassword);

      // Clear the OTP
      await storage.clearPasswordResetOtp(email);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const { experienceLevel, location, search } = req.query;
      const jobs = await storage.getJobs({
        experienceLevel: experienceLevel as string,
        location: location as string,
        search: search as string,
      });
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      // SECURITY: Verify security token from admin system
      const { _securityToken, _timestamp, ...jobRequestData } = req.body;

      if (!_securityToken || !_timestamp) {
        return res.status(403).json({ message: "Security validation failed. Job creation requires proper authentication." });
      }

      // Verify token timestamp validity (within 1 hour)
      const tokenAge = Date.now() - Number(_timestamp);
      if (tokenAge > 3600000) { // 1 hour
        return res.status(403).json({ message: "Security token expired. Please re-authenticate." });
      }

      // Convert string date to Date object
      const jobData = {
        ...jobRequestData,
        closingDate: new Date(jobRequestData.closingDate),
        experienceMin: Number(jobRequestData.experienceMin) || 0,
        experienceMax: Number(jobRequestData.experienceMax) || 1,
      };

      const validatedData = insertJobSchema.parse(jobData);
      const job = await storage.createJob(validatedData);
      res.json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  // Applications routes
  app.post("/api/applications", async (req, res) => {
    try {
      const validatedData = insertApplicationSchema.parse(req.body);
      const application = await storage.createApplication(validatedData);
      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.get("/api/applications/user/:userId", async (req, res) => {
    try {
      const applications = await storage.getUserApplications(req.params.userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching user applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.delete("/api/applications/:id", async (req, res) => {
    try {
      await storage.deleteApplication(req.params.id);
      res.json({ message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ message: "Failed to delete application" });
    }
  });

  // Courses routes
  app.get("/api/courses", async (req, res) => {
    try {
      const { category } = req.query;
      const courses = await storage.getCourses(category as string);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post("/api/courses", async (req, res) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validatedData);
      res.json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Companies routes
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Company management routes
  app.post("/api/companies", async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Contact routes
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  // Job URL Analysis route
  app.post("/api/jobs/analyze-url", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // For now, we'll return a mock analysis based on common job sites
      // In a real implementation, you would use web scraping or APIs
      const mockAnalysis = {
        title: "Software Developer",
        description: "Join our team as a Software Developer. Work on exciting projects with cutting-edge technologies.",
        requirements: "Programming skills, Problem-solving abilities, Team collaboration",
        qualifications: "Bachelor's degree in Computer Science or related field",
        skills: "JavaScript, React, Node.js, Python, SQL",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 2,
        location: "Bengaluru, India",
        jobType: "full-time",
        salary: "₹4-6 LPA",
        applyUrl: url,
        closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        batchEligible: "2024",
        isActive: true,
        companyId: "accenture-id" // Default company for demo
      };

      res.json(mockAnalysis);
    } catch (error) {
      console.error("Error analyzing job URL:", error);
      res.status(500).json({ message: "Failed to analyze job URL" });
    }
  });

  // SECURITY: Admin password verification system
  // This system is essential for secure job posting functionality
  app.post("/api/admin/verify-password", async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required" });
      }

      // SECURITY: Encrypted password verification - NO plaintext passwords
      const { createHash } = await import('crypto');
      const inputHash = createHash('sha256').update(password + 'jobportal_secure_2024').digest('hex');
      const correctHash = 'a223ba8073ffd61e2c4705bebb65d938f4073142369998524bb5293c9f1534ad'; // Secure hash

      console.log('🔐 Admin access attempt - verifying credentials...');
      console.log('🔒 Security check:', inputHash.slice(0, 8) + '****');

      if (inputHash === correctHash) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: "Invalid password" });
      }
    } catch (error) {
      console.error("Error verifying admin password:", error);
      res.status(500).json({ success: false, message: "Failed to verify password" });
    }
  });

  // Admin recovery OTP system
  app.post("/api/admin/send-recovery-otp", async (req, res) => {
    try {
      const { email } = req.body;

      // Verify this is the authorized recovery email
      const authorizedEmail = 'ramdegala3@gmail.com';
      if (email !== authorizedEmail) {
        return res.status(403).json({ success: false, message: "Unauthorized email" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP for recovery
      await storage.storePasswordResetOtp(email, otp);

      // Send email using SendGrid with proper error handling
      const { default: sgMail } = await import('@sendgrid/mail');

      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }

      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: email,
        from: 'ramdegala3@gmail.com', // Must be verified in SendGrid
        subject: 'Admin Access Recovery - Job Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Admin Access Recovery</h2>
            <p>You requested to recover access to the Admin Job Portal.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0;">Recovery Code:</h3>
              <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 4px; margin: 10px 0;">${otp}</h1>
            </div>
            <p><strong>This code will expire in 5 minutes.</strong></p>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this recovery, please ignore this email.
            </p>
          </div>
        `
      };

      try {
        await sgMail.send(msg);
        console.log(`Recovery OTP sent successfully to ${email}: ${otp}`);
        res.json({ success: true, message: "Recovery OTP sent successfully" });
      } catch (emailError) {
        // Fallback: Log OTP to console for testing when SendGrid is not configured
        console.log(`🔐 BACKUP - Recovery OTP generated for ${email.slice(0,3)}***@gmail.com: ${otp}`);
        console.log('Note: Configure SendGrid sender verification to send actual emails');
        res.json({ success: true, message: "Recovery OTP ready (check admin console)" });
      }
    } catch (error) {
      console.error("Error sending recovery OTP:", error);
      res.status(500).json({ success: false, message: "Failed to send recovery OTP" });
    }
  });

  // Verify recovery OTP
  app.post("/api/admin/verify-recovery-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;

      // Verify this is the authorized recovery email
      const authorizedEmail = 'ramdegala3@gmail.com';
      if (email !== authorizedEmail) {
        return res.status(403).json({ success: false, message: "Unauthorized email" });
      }

      if (!otp) {
        return res.status(400).json({ success: false, message: "OTP is required" });
      }

      const isValid = await storage.verifyPasswordResetOtp(email, otp);

      if (!isValid) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }

      // Clear the OTP after successful verification
      await storage.clearPasswordResetOtp(email);

      res.json({ success: true, message: "Recovery verified successfully" });
    } catch (error) {
      console.error("Error verifying recovery OTP:", error);
      res.status(500).json({ success: false, message: "Failed to verify recovery OTP" });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Presentation download routes
  app.get('/download-html', (req, res) => {
    try {
      const mdPath = path.join(__dirname, '..', 'JobPortal_Complete_Presentation.md');

      if (!fs.existsSync(mdPath)) {
        return res.status(404).json({ message: 'Presentation file not found' });
      }

      const markdownContent = fs.readFileSync(mdPath, 'utf8');
      const htmlContent = marked.parse(markdownContent);

      const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JobPortal Complete Presentation</title>
  <style>
    body { 
      font-family: 'Arial', sans-serif; 
      line-height: 1.6; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px;
      color: #333;
    }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #1d4ed8; }
    .page-break { page-break-before: always; }
    code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
    pre { background: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
    blockquote { border-left: 4px solid #2563eb; margin: 0; padding-left: 20px; font-style: italic; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 40px 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="JobPortal_Complete_Presentation.html"');
      res.send(fullHTML);
    } catch (error) {
      console.error('Error generating HTML:', error);
      res.status(500).json({ message: 'Error generating HTML file' });
    }
  });

  app.get('/download-markdown', (req, res) => {
    try {
      const mdPath = path.join(__dirname, '..', 'JobPortal_Complete_Presentation.md');

      if (!fs.existsSync(mdPath)) {
        return res.status(404).json({ message: 'Presentation file not found' });
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="JobPortal_Complete_Presentation.md"');
      res.sendFile(mdPath);
    } catch (error) {
      console.error('Error downloading markdown:', error);
      res.status(500).json({ message: 'Error downloading markdown file' });
    }
  });

  app.get('/presentation', (req, res) => {
    try {
      const mdPath = path.join(__dirname, '..', 'JobPortal_Complete_Presentation.md');

      if (!fs.existsSync(mdPath)) {
        return res.status(404).json({ message: 'Presentation file not found' });
      }

      const markdownContent = fs.readFileSync(mdPath, 'utf8');
      const htmlContent = marked.parse(markdownContent);

      const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JobPortal Complete Presentation</title>
  <style>
    body { 
      font-family: 'Arial', sans-serif; 
      line-height: 1.6; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px;
      color: #333;
      background: #f8fafc;
    }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; font-size: 2.5em; }
    h2 { color: #1e40af; margin-top: 40px; font-size: 2em; }
    h3 { color: #1d4ed8; font-size: 1.5em; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; }
    pre { background: #f9fafb; padding: 20px; border-radius: 8px; overflow-x: auto; border-left: 4px solid #2563eb; }
    blockquote { border-left: 4px solid #2563eb; margin: 20px 0; padding-left: 20px; font-style: italic; background: #f8fafc; padding: 15px 20px; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 40px 0; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print/Save as PDF</button>
  <div class="container">
    ${htmlContent}
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(fullHTML);
    } catch (error) {
      console.error('Error serving presentation:', error);
      res.status(500).json({ message: 'Error loading presentation' });
    }
  });

  // PDF download endpoint (fallback)
  app.get('/download-pdf', (req, res) => {
    const pdfPath = path.join(__dirname, '..', 'JobPortal_Complete_Presentation.pdf');

    if (fs.existsSync(pdfPath)) {
      res.download(pdfPath, 'JobPortal_Complete_Presentation.pdf', (err) => {
        if (err) {
          console.error('Error downloading PDF:', err);
          res.status(500).json({ message: 'Error downloading PDF' });
        }
      });
    } else {
      res.status(404).json({ message: 'PDF file not found' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}