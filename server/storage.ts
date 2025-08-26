import { 
  type User, type InsertUser, type Company, type InsertCompany,
  type Job, type InsertJob, type Course, type InsertCourse,
  type Application, type InsertApplication, type Contact, type InsertContact,
  type LoginData
} from "@shared/schema";
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
    // Sample companies
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
      },
      {
        id: "hcl-id",
        name: "HCL Technologies",
        description: "An Indian multinational IT services and consulting company",
        website: "https://www.hcltech.com",
        linkedinUrl: "https://www.linkedin.com/company/hcl-technologies",
        logo: "https://logoeps.com/wp-content/uploads/2013/03/hcl-vector-logo.png",
        location: "Noida, India",
        createdAt: new Date(),
      },
      {
        id: "wipro-id",
        name: "Wipro",
        description: "A leading global information technology, consulting and business process services company",
        website: "https://www.wipro.com",
        linkedinUrl: "https://www.linkedin.com/company/wipro",
        logo: "https://logoeps.com/wp-content/uploads/2013/03/wipro-vector-logo.png",
        location: "Bengaluru, India",
        createdAt: new Date(),
      },
      {
        id: "cognizant-id",
        name: "Cognizant",
        description: "An American multinational information technology services and consulting company",
        website: "https://www.cognizant.com",
        linkedinUrl: "https://www.linkedin.com/company/cognizant",
        logo: "https://logoeps.com/wp-content/uploads/2013/03/cognizant-vector-logo.png",
        location: "Chennai, India",
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
        closingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        batchEligible: "2023, 2024",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-2",
        companyId: "tcs-id",
        title: "Associate Software Engineer",
        description: "Opportunity to work on cutting-edge projects with global clients. We are looking for passionate freshers who are eager to learn and grow.",
        requirements: "Good analytical skills, Willingness to learn new technologies, Strong communication skills",
        qualifications: "BE/B.Tech/MCA from recognized university. No active backlogs. Minimum 60% in 10th, 12th, and graduation.",
        skills: "C, C++, Java, Database concepts, Web technologies, Logical reasoning",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 0,
        location: "Pune, Kolkata, Kochi",
        jobType: "full-time",
        salary: "₹3.36 LPA",
        applyUrl: "https://tcs.com/careers",
        closingDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        batchEligible: "2024",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-3",
        companyId: "infosys-id",
        title: "Systems Engineer",
        description: "Be part of Infosys digital transformation journey. Work on innovative solutions and latest technologies.",
        requirements: "Programming knowledge, Database concepts, Problem-solving abilities",
        qualifications: "Engineering degree with minimum 65% marks. No gaps in education. Good communication skills.",
        skills: "Programming languages, Database management, System design, Agile methodology",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 1,
        location: "Mysuru, Thiruvananthapuram, Bhubaneswar",
        jobType: "full-time",
        salary: "₹3.6 LPA",
        applyUrl: "https://infosys.com/careers",
        closingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        batchEligible: "2023, 2024",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-4",
        companyId: "accenture-id",
        title: "Senior Software Engineer",
        description: "Lead development teams and work on enterprise-level applications. Mentor junior developers and drive technical excellence.",
        requirements: "Leadership skills, Enterprise application development, Microservices architecture",
        qualifications: "Bachelor's/Master's degree with 3+ years of experience. Strong technical background and leadership skills.",
        skills: "Java/Python, Spring Boot, Microservices, Cloud platforms, Team leadership",
        experienceLevel: "experienced",
        experienceMin: 3,
        experienceMax: 6,
        location: "Bengaluru, Gurgaon",
        jobType: "full-time",
        salary: "₹12 - 18 LPA",
        applyUrl: "https://accenture.com/careers/apply",
        closingDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        batchEligible: "",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-5",
        companyId: "tcs-id",
        title: "Technical Lead - Full Stack",
        description: "Lead full-stack development projects. Work with latest technologies and mentor development teams.",
        requirements: "Full-stack development, Team management, Client interaction",
        qualifications: "Engineering degree with 4+ years of experience. Strong technical and communication skills.",
        skills: "React, Node.js, Python, AWS, Team management, Client communication",
        experienceLevel: "experienced",
        experienceMin: 4,
        experienceMax: 8,
        location: "Chennai, Mumbai",
        jobType: "full-time",
        salary: "₹15 - 22 LPA",
        applyUrl: "https://tcs.com/careers",
        closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        batchEligible: "",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-6",
        companyId: "hcl-id",
        title: "Software Engineer Trainee",
        description: "Join HCL Technologies as a Software Engineer Trainee. Get comprehensive training and work on real-world projects.",
        requirements: "Good programming fundamentals, Learning mindset, Team collaboration",
        qualifications: "BE/B.Tech/MCA with minimum 60% marks. No backlogs. Good communication skills.",
        skills: "Java, C++, Python, Database concepts, Web development, Problem-solving",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 1,
        location: "Noida, Bengaluru, Chennai",
        jobType: "full-time",
        salary: "₹3.2 - 4.0 LPA",
        applyUrl: "https://hcltech.com/careers",
        closingDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
        batchEligible: "2024",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-7",
        companyId: "wipro-id",
        title: "Project Engineer",
        description: "Start your career with Wipro as a Project Engineer. Work on cutting-edge technologies and global projects.",
        requirements: "Technical skills, Adaptability, Communication skills",
        qualifications: "Engineering degree with good academic record. Minimum 65% throughout academics.",
        skills: "Programming languages, Software development, Testing, Agile methodology",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 1,
        location: "Bengaluru, Pune, Hyderabad",
        jobType: "full-time",
        salary: "₹3.5 - 4.2 LPA",
        applyUrl: "https://wipro.com/careers",
        closingDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // 22 days from now
        batchEligible: "2023, 2024",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "job-expired",
        companyId: "infosys-id",
        title: "Software Developer - Expired",
        description: "This position has been closed.",
        requirements: "Programming skills",
        qualifications: "Bachelor's degree",
        skills: "Java, Python",
        experienceLevel: "fresher",
        experienceMin: 0,
        experienceMax: 1,
        location: "Bengaluru",
        jobType: "full-time",
        salary: "₹3.5 LPA",
        applyUrl: "https://infosys.com/careers",
        closingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        batchEligible: "2024",
        isActive: false,
        createdAt: new Date(),
      }
    ];

    jobs.forEach(job => this.jobs.set(job.id, job));

    // Sample courses
    const courses = [
      {
        id: "html-course",
        title: "Complete HTML & CSS Course",
        description: "Learn HTML and CSS from scratch. Build responsive websites and understand web fundamentals.",
        instructor: "John Doe",
        duration: "6 weeks",
        level: "beginner",
        category: "web-development",
        imageUrl: "/images/html-course.jpg",
        courseUrl: "https://www.skillshare.com/browse/web-development",
        price: "Free",
        createdAt: new Date(),
      },
      {
        id: "python-course",
        title: "Python Programming for Beginners",
        description: "Master Python programming from basics to advanced concepts. Perfect for beginners and job seekers.",
        instructor: "Jane Smith",
        duration: "8 weeks",
        level: "beginner",
        category: "programming",
        imageUrl: "/images/python-course.jpg",
        courseUrl: "https://www.python.org/about/gettingstarted/",
        price: "₹2,999",
        createdAt: new Date(),
      },
      {
        id: "javascript-course",
        title: "JavaScript Fundamentals",
        description: "Learn JavaScript programming language and build interactive web applications.",
        instructor: "Mike Johnson",
        duration: "10 weeks",
        level: "intermediate",
        category: "web-development",
        imageUrl: "/images/js-course.jpg",
        courseUrl: "https://www.udemy.com/topic/javascript/",
        price: "₹3,999",
        createdAt: new Date(),
      },
      {
        id: "react-course",
        title: "React.js Development",
        description: "Build modern web applications with React.js. Learn components, hooks, and state management.",
        instructor: "Sarah Wilson",
        duration: "12 weeks",
        level: "intermediate",
        category: "web-development",
        imageUrl: "/images/react-course.jpg",
        courseUrl: "https://react.dev/learn",
        price: "₹4,999",
        createdAt: new Date(),
      },
      {
        id: "nodejs-course",
        title: "Node.js Backend Development",
        description: "Master server-side development with Node.js. Build APIs and full-stack applications.",
        instructor: "David Lee",
        duration: "10 weeks",
        level: "intermediate",
        category: "backend",
        imageUrl: "/images/nodejs-course.jpg",
        courseUrl: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
        price: "₹5,499",
        createdAt: new Date(),
      },
      {
        id: "data-structures-course",
        title: "Data Structures & Algorithms",
        description: "Learn essential data structures and algorithms for programming interviews and competitive coding.",
        instructor: "Dr. Alex Kumar",
        duration: "14 weeks",
        level: "intermediate",
        category: "programming",
        imageUrl: "/images/dsa-course.jpg",
        courseUrl: "https://www.coursera.org/specializations/data-structures-algorithms",
        price: "₹6,999",
        createdAt: new Date(),
      },
      {
        id: "machine-learning-course",
        title: "Introduction to Machine Learning",
        description: "Get started with machine learning concepts, algorithms, and practical implementation.",
        instructor: "Dr. Priya Sharma",
        duration: "16 weeks",
        level: "advanced",
        category: "data-science",
        imageUrl: "/images/ml-course.jpg",
        courseUrl: "https://www.coursera.org/learn/machine-learning",
        price: "₹8,999",
        createdAt: new Date(),
      },
      {
        id: "cybersecurity-course",
        title: "Cybersecurity Fundamentals",
        description: "Learn cybersecurity basics, ethical hacking, and network security principles.",
        instructor: "Mark Roberts",
        duration: "12 weeks",
        level: "intermediate",
        category: "cybersecurity",
        imageUrl: "/images/cyber-course.jpg",
        courseUrl: "https://www.cybrary.it/catalog/cybersecurity/",
        price: "₹7,499",
        createdAt: new Date(),
      },
      {
        id: "database-course",
        title: "Database Management Systems",
        description: "Master SQL, database design, and learn popular database management systems.",
        instructor: "Lisa Chen",
        duration: "8 weeks",
        level: "beginner",
        category: "database",
        imageUrl: "/images/db-course.jpg",
        courseUrl: "https://www.khanacademy.org/computing/computer-programming/intro-to-sql",
        price: "₹3,499",
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
      ...insertContact,
      id,
      createdAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }

  // Password reset methods
  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = { ...user, password: hashedPassword };
    this.users.set(user.id, updatedUser);
  }

  async storePasswordResetOtp(email: string, otp: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    this.passwordResetOtps.set(email, { otp, expiresAt });
  }

  async verifyPasswordResetOtp(email: string, otp: string): Promise<boolean> {
    const stored = this.passwordResetOtps.get(email);
    if (!stored) {
      return false;
    }
    
    // Check if OTP has expired
    if (new Date() > stored.expiresAt) {
      this.passwordResetOtps.delete(email);
      return false;
    }
    
    return stored.otp === otp;
  }

  async clearPasswordResetOtp(email: string): Promise<void> {
    this.passwordResetOtps.delete(email);
  }
}

export const storage = new MemStorage();
