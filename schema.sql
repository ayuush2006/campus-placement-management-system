-- ==============================================================================
-- Campus Placement Management System - Database Schema (Phase 2)
-- Database Name: campus_placement_db
-- ==============================================================================

-- 1. Create the database if it does not already exist
CREATE DATABASE IF NOT EXISTS campus_placement_db;
USE campus_placement_db;

-- 2. Drop existing tables in reverse dependency order (to avoid foreign key conflicts)
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS users;

-- ==============================================================================
-- TABLE 1: users
-- Stores login accounts for both students and placement administrators.
-- ==============================================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 2: student_profiles
-- Stores academic details for students (1-to-1 relationship with users table).
-- Foreign Key: user_id references users(user_id)
-- ==============================================================================
CREATE TABLE student_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    branch VARCHAR(50) NOT NULL,
    cgpa DECIMAL(3, 2) NOT NULL,
    backlogs INT NOT NULL DEFAULT 0,
    phone VARCHAR(20),
    resume_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE 3: companies
-- Stores registered companies offering placement opportunities.
-- ==============================================================================
CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    website VARCHAR(255),
    location VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    contact_email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 4: jobs
-- Stores placement job openings posted by companies.
-- Includes criteria: minimum_cgpa, allowed_branch, maximum_backlogs.
-- Foreign Key: company_id references companies(company_id)
-- ==============================================================================
CREATE TABLE jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    package_lpa DECIMAL(5, 2) NOT NULL,
    location VARCHAR(100),
    minimum_cgpa DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    allowed_branch VARCHAR(255) NOT NULL,
    maximum_backlogs INT NOT NULL DEFAULT 0,
    deadline DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE 5: applications
-- Stores job applications submitted by students.
-- Foreign Keys: student_id references users(user_id), job_id references jobs(job_id)
-- Status: 'Applied', 'Shortlisted', 'Rejected'
-- ==============================================================================
CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    job_id INT NOT NULL,
    status ENUM('Applied', 'Shortlisted', 'Rejected') NOT NULL DEFAULT 'Applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    CONSTRAINT unique_student_job UNIQUE (student_id, job_id)
);
