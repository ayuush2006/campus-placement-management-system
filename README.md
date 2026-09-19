# Campus Placement Management System

A beginner-friendly web application designed to manage and streamline campus placement processes for students and administrators.

---

## 📌 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (No React/Next.js/Tailwind)
- **Backend:** Node.js, Express.js (REST API)
- **Database:** MySQL (Configured in Phase 2)
- **Version Control:** Git & GitHub

### Allowed Backend Libraries
- `express` - Web framework for handling HTTP requests and routing
- `mysql2` - MySQL database client
- `bcryptjs` - Password hashing utility
- `jsonwebtoken` - Token-based authentication (JWT)
- `dotenv` - Environment variable manager
- `cors` - Cross-Origin Resource Sharing middleware

---

## 📁 Project Structure

```
campus-placement/
│
├── config/             # Configuration files (e.g., MySQL database connection)
│   └── README.md
├── controllers/        # Request handling logic (auth, student, job, admin)
│   └── README.md
├── middleware/         # Custom middlewares (JWT auth check, role check)
│   └── README.md
├── routes/             # API route definitions (endpoints)
│   └── README.md
├── utils/              # Helper functions and utilities
│   └── README.md
├── frontend/           # Static frontend client files
│   ├── css/
│   │   └── style.css   # Pure CSS styles
│   ├── js/
│   │   └── app.js      # Vanilla JavaScript logic
│   └── index.html      # Main HTML landing page & health monitor
├── .env                # Local environment variables (do not commit to Git)
├── .env.example        # Sample environment variable template
├── .gitignore          # Files and folders to ignore in Git
├── package.json        # Node.js project metadata and dependencies
├── README.md           # Project documentation
└── server.js           # Express server entry point
```

---

## 🚀 Getting Started (Phase 1)

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v18 or higher recommended).
- Git installed.

### 1. Clone or Open the Repository
Navigate into the project directory:
```bash
cd "campus placement"
```

### 2. Install Dependencies
Run:
```bash
npm install
```
*(On Windows PowerShell, if you face script permission errors, use `npm.cmd install`)*

### 3. Configure Environment Variables
Verify that `.env` exists. If not, copy it from `.env.example`:
```bash
cp .env.example .env
```
Default PORT is set to `5000`.

### 4. Start the Server
Run the following command:
```bash
npm start
```
Or directly with Node.js:
```bash
node server.js
```

### 5. Access the Application
- **Frontend Dashboard:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

Expected response from `/api/health`:
```json
{
  "success": true,
  "message": "Campus Placement API is running"
}
```

---

## 🧭 Project Roadmap

- [x] **Phase 1: Project Initialization & Base Architecture**
  - Clean project structure created.
  - Node.js & Express server initialized.
  - Dependencies installed.
  - Health check API route (`GET /api/health`).
  - Beginner-friendly frontend to test server health.
- [ ] **Phase 2: Database Setup & Authentication**
  - MySQL database creation & connection pool (`mysql2`).
  - Student & Admin registration & login (`bcryptjs`, `jsonwebtoken`).
- [ ] **Phase 3: Job Listings & Eligibility Engine**
  - Company & job creation (Admin).
  - Eligibility calculation based on CGPA, branch, and backlogs.
- [ ] **Phase 4: Applications & Admin Dashboard**
  - Student job application submission and status tracking.
  - Admin shortlisting/rejection workflows.
