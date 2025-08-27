import { 
  type User, type InsertUser, type Company, type InsertCompany,
  type Job, type InsertJob, type Course, type InsertCourse,
  type Application, type InsertApplication, type Contact, type InsertContact,
  type LoginData
} from "../shared/schema.js";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  validateUser(email: string, password: string): Promise<User | undefined>;
  updateUserPassword(email: string, newPassword: string): Promise<void>;
  
  // Password reset
  storePasswordResetOtp(email: string, otp: string): Promise<void>;
  verifyPasswordResetOtp(email: string, otp: string): Promise<boolean>;
  clearPasswordResetOtp(email: string): Promise<void>;
  
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Jobs
  getJobs(filters?: { experienceLevel?: string; location?: string; search?: string }): Promise<(Job & { company: Company })[]>;
  getJob(id: string): Promise<(Job & { company: Company }) | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  
  // Applications
  createApplication(application: InsertApplication): Promise<Application>;
  getUserApplications(userId: string): Promise<(Application & { job: Job & { company: Company } })[]>;
  deleteApplication(id: string): Promise<void>;
  
  // Courses
  getCourses(category?: string): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  
  // Contact
  createContact(contact: InsertContact): Promise<Contact>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private companies: Map<string, Company>;
  private jobs: Map<string, Job>;
  private courses: Map<string, Course>;
  private applications: Map<string, Application>;
  private contacts: Map<string, Contact>;
  private passwordResetOtps: Map<string, { otp: string; expiresAt: Date }>;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.jobs = new Map();
    this.courses = new Map();
    this.applications = new Map();
    this.contacts = new Map();
    this.passwordResetOtps = new Map();
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  async initializeSampleData() {
    // Sample companies with major Indian IT companies
    const companies = [
      {
        id: "accenture-id",
        name: "Accenture",
        description: "A leading global professional services company",
        website: "https://www.accenture.com",
        linkedinUrl: "https://www.linkedin.com/company/accenture",
        logo: "https://logoeps.com/wp-content/uploads/2014/05/36208-accenture-vector-logo.png",
        location: "Bengaluru, India",
        createdAt: new Date(),
      },
      {
        id: "tcs-id",
        name: "Tata Consultancy Services",
        description: "An Indian multinational IT services and consulting company",
        website: "https://www.tcs.com",
        linkedinUrl: "https://www.linkedin.com/company/tata-consultancy-services",
        logo: "https://logoeps.com/wp-content/uploads/2013/03/tcs-vector-logo.png",
        location: "Mumbai, India",
        createdAt: new Date(),
      },
      {
        id: "infosys-id",
        name: "Infosys",
        description: "A global leader in next-generation digital services and consulting",
        website: "https://www.infosys.com",
        linkedinUrl: "https://www.linkedin.com/company/infosys",
        logo: "https://logoeps.com/wp-content/uploads/2013/03/infosys-vector-logo.png",
        location: "Bengaluru, India",
        createdAt: new Date(),
      }
    ];

    companies.forEach(company => this.companies.set(company.id, company));

    // Sample jobs
    const jobs = [
      {
        id: "job-1",
        companyId: "accenture-id",
        title: "Software Developer - Fresher",
        description: "Join our dynamic team as a Software Developer. Perfect opportunity for fresh graduates to kick-start their career in technology.",
        requirements: "Strong programming fundamentals, Problem-solving skills, Team collaboration",
        qualifications: "Bachelor's degree in Computer Science, IT, or related field. Good academic record with minimum 60% throughout academics.",
        skills: "Java, Python, JavaScript, SQL, Git, Problem-solving, Communication",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 1,
        location: "Bengaluru, Chennai, Hyderabad",
        jobType: "full-time",
        salary: "₹3.5 - 4.5 LPA",
        applyUrl: "https://accenture.com/careers/apply",
        closingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        batchEligible: "2023, 2024",
        isActive: true,
        createdAt: new Date(),
      }
    ];

    jobs.forEach(job => this.jobs.set(job.id, job));

    // Sample courses
    const courses = [
      {
        id: "python-course",
        title: "Python Programming for Beginners",
        description: "Master Python programming from basics to advanced concepts.",
        instructor: "Jane Smith",
        duration: "8 weeks",
        level: "beginner",
        category: "programming",
        imageUrl: "/images/python-course.jpg",
        courseUrl: "https://www.python.org/about/gettingstarted/",
        price: "₹2,999",
        createdAt: new Date(),
      }
    ];

    courses.forEach(course => this.courses.set(course.id, course));
  }

  // Auth methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      fullName: insertUser.fullName,
      phone: insertUser.phone || null,
      password: hashedPassword,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async validateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : undefined;
  }

  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) throw new Error("User not found");
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = { ...user, password: hashedPassword };
    this.users.set(user.id, updatedUser);
  }

  async storePasswordResetOtp(email: string, otp: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.passwordResetOtps.set(email, { otp, expiresAt });
  }

  async verifyPasswordResetOtp(email: string, otp: string): Promise<boolean> {
    const stored = this.passwordResetOtps.get(email);
    if (!stored) return false;
    
    if (new Date() > stored.expiresAt) {
      this.passwordResetOtps.delete(email);
      return false;
    }
    
    return stored.otp === otp;
  }

  async clearPasswordResetOtp(email: string): Promise<void> {
    this.passwordResetOtps.delete(email);
  }

  // Company methods
  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const company: Company = {
      id,
      name: insertCompany.name,
      description: insertCompany.description || null,
      website: insertCompany.website || null,
      linkedinUrl: insertCompany.linkedinUrl || null,
      logo: insertCompany.logo || null,
      location: insertCompany.location || null,
      createdAt: new Date(),
    };
    this.companies.set(id, company);
    return company;
  }

  // Job methods
  async getJobs(filters?: { experienceLevel?: string; location?: string; search?: string }): Promise<(Job & { company: Company })[]> {
    let jobs = Array.from(this.jobs.values());
    
    if (filters?.experienceLevel) {
      jobs = jobs.filter(job => job.experienceLevel === filters.experienceLevel);
    }
    
    if (filters?.location) {
      jobs = jobs.filter(job => job.location.toLowerCase().includes(filters.location!.toLowerCase()));
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      jobs = jobs.filter(job => 
        job.title.toLowerCase().includes(search) ||
        job.description.toLowerCase().includes(search) ||
        job.skills.toLowerCase().includes(search)
      );
    }

    return jobs.map(job => {
      const company = this.companies.get(job.companyId)!;
      return { ...job, company };
    });
  }

  async getJob(id: string): Promise<(Job & { company: Company }) | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const company = this.companies.get(job.companyId)!;
    return { ...job, company };
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      id,
      companyId: insertJob.companyId,
      title: insertJob.title,
      description: insertJob.description,
      requirements: insertJob.requirements,
      qualifications: insertJob.qualifications,
      skills: insertJob.skills,
      experienceLevel: insertJob.experienceLevel,
      experienceMin: insertJob.experienceMin || null,
      experienceMax: insertJob.experienceMax || null,
      location: insertJob.location,
      jobType: insertJob.jobType,
      salary: insertJob.salary || null,
      applyUrl: insertJob.applyUrl || null,
      closingDate: insertJob.closingDate,
      batchEligible: insertJob.batchEligible || null,
      isActive: insertJob.isActive ?? true,
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;

    const updated: Job = { ...existing, ...updates };
    this.jobs.set(id, updated);
    return updated;
  }

  // Application methods
  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = randomUUID();
    const application: Application = {
      id,
      userId: insertApplication.userId,
      jobId: insertApplication.jobId,
      status: insertApplication.status || null,
      appliedAt: new Date(),
    };
    this.applications.set(id, application);
    return application;
  }

  async getUserApplications(userId: string): Promise<(Application & { job: Job & { company: Company } })[]> {
    const userApps = Array.from(this.applications.values()).filter(app => app.userId === userId);
    
    return userApps.map(app => {
      const job = this.jobs.get(app.jobId)!;
      const company = this.companies.get(job.companyId)!;
      return { ...app, job: { ...job, company } };
    });
  }

  async deleteApplication(id: string): Promise<void> {
    this.applications.delete(id);
  }

  // Course methods
  async getCourses(category?: string): Promise<Course[]> {
    let courses = Array.from(this.courses.values());
    
    if (category) {
      courses = courses.filter(course => course.category === category);
    }
    
    return courses;
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = randomUUID();
    const course: Course = {
      id,
      title: insertCourse.title,
      description: insertCourse.description,
      instructor: insertCourse.instructor || null,
      duration: insertCourse.duration || null,
      level: insertCourse.level || null,
      category: insertCourse.category,
      imageUrl: insertCourse.imageUrl || null,
      courseUrl: insertCourse.courseUrl || null,
      price: insertCourse.price || null,
      createdAt: new Date(),
    };
    this.courses.set(id, course);
    return course;
  }

  // Contact methods
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      id,
      name: insertContact.name,
      email: insertContact.email,
      message: insertContact.message,
      createdAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }
}

export const storage = new MemStorage();
