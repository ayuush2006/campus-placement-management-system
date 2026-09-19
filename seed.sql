-- ==============================================================================
-- Campus Placement Management System - Seed Data (Phase 2)
-- Database Name: campus_placement_db
-- ==============================================================================

USE campus_placement_db;

-- 1. Insert Sample Users (1 Admin, 3 Students)
-- Passwords are hashed with bcrypt (admin123 for admin, student123 for students)
INSERT INTO users (user_id, name, email, password, role) VALUES
(1, 'Placement Officer', 'admin@placement.edu', '$2b$10$0a22TRbSzDHZzX8iYzFC5OHhfIVBvGl5Utpk8pSQa4knERzE5YS.C', 'admin'),
(2, 'Rahul Sharma', 'rahul@student.edu', '$2b$10$r1Cr31B9UFLrLSbHTRH/Mepr/Efqc.9zNiXyM2EZydvhQYz7LRXL2', 'student'),
(3, 'Priya Patel', 'priya@student.edu', '$2b$10$r1Cr31B9UFLrLSbHTRH/Mepr/Efqc.9zNiXyM2EZydvhQYz7LRXL2', 'student'),
(4, 'Amit Verma', 'amit@student.edu', '$2b$10$r1Cr31B9UFLrLSbHTRH/Mepr/Efqc.9zNiXyM2EZydvhQYz7LRXL2', 'student');

-- 2. Insert Student Profiles (for student user_ids 2, 3, 4)
INSERT INTO student_profiles (profile_id, user_id, roll_number, branch, cgpa, backlogs, phone, resume_url) VALUES
(1, 2, 'CS2026001', 'CSE', 8.65, 0, '9876543210', 'https://example.com/resumes/rahul.pdf'),
(2, 3, 'IT2026042', 'IT', 7.80, 0, '9876543211', 'https://example.com/resumes/priya.pdf'),
(3, 4, 'ME2026105', 'MECH', 6.40, 2, '9876543212', 'https://example.com/resumes/amit.pdf');

-- 3. Insert Sample Companies
INSERT INTO companies (company_id, name, website, location, industry, description, contact_email) VALUES
(1, 'Google', 'https://careers.google.com', 'Bangalore, India', 'Software & Cloud', 'Global technology leader in search, cloud, and AI.', 'campus-in@google.com'),
(2, 'Microsoft', 'https://careers.microsoft.com', 'Hyderabad, India', 'Enterprise Software', 'Empowering every person and organization on the planet.', 'campus-recruitment@microsoft.com'),
(3, 'Infosys', 'https://www.infosys.com/careers', 'Pune, India', 'IT Services & Consulting', 'A global leader in next-generation digital services and consulting.', 'freshers@infosys.com');

-- 4. Insert Sample Placement Jobs with Eligibility Criteria
INSERT INTO jobs (job_id, company_id, title, description, package_lpa, location, minimum_cgpa, allowed_branch, maximum_backlogs, deadline) VALUES
(1, 1, 'Software Engineer (SDE-1)', 'Develop and scale cloud-native applications and APIs.', 22.00, 'Bangalore', 8.00, 'CSE,IT,ECE', 0, '2026-11-30'),
(2, 2, 'Cloud Solutions Engineer', 'Work on Azure cloud infrastructure and enterprise client solutions.', 18.50, 'Hyderabad', 7.50, 'CSE,IT', 0, '2026-11-15'),
(3, 3, 'Associate Systems Engineer', 'Full-stack software development and client project delivery.', 6.50, 'Pune', 6.00, 'ALL', 1, '2026-12-31');

-- 5. Insert Sample Applications
-- Rahul applied to Google (Shortlisted) & Microsoft (Applied)
-- Priya applied to Infosys (Applied)
-- Amit applied to Infosys (Rejected due to backlogs)
INSERT INTO applications (application_id, student_id, job_id, status) VALUES
(1, 2, 1, 'Shortlisted'),
(2, 2, 2, 'Applied'),
(3, 3, 3, 'Applied'),
(4, 4, 3, 'Rejected');
