The NGO Operations CRM is a premium, secure, and modern management platform designed for charitable organizations. It serves as a centralized hub to digitize volunteer coordination, target assistance for beneficiaries, aggregate donor relations, and monitor campaigns in real-time.

🔑 1. Role-Based Access Control & Approvals
The system uses strict Row-Level Security (RLS) at the database level to partition access based on three roles:

Administrator (Admin): Full control. Manages the system configurations, manages the User Directory, and approves/rejects new staff requests. Strict single-admin rule is enforced.
Manager: Complete operational access to create, update, and manage campaigns, donors, donations, beneficiaries, and tasks.
Public User (Volunteer): Read-only access to view active campaigns, public tasks, and update the status of tasks assigned to themselves.
🛠️ 2. Core Functional Modules
📊 Executive Dashboard
Real-time Analytics: High-level indicators showing total funds raised, total lives impacted, active campaigns, and volunteer counts.
Progress Charts: Beautiful interactive visual charts tracking monthly donations and campaign target comparisons.
Recent Activity Stream: A security log displaying system actions taken by authenticated users.
📢 Campaign Management
Track progress bars showing target budgets versus actual funds collected.
Manage campaign status updates (planning, active, completed, cancelled).
Assign volunteers to specific active campaigns.
💳 Donors & Donation Tracking
Donation Ledger: Record transaction methods (UPI, Bank Transfer, Card, Cash), dates, and notes.
Donor Aggregates: Automated triggers sum total donations automatically whenever a new contribution is recorded.
👥 Beneficiary Directory
Register demographic records (age, family count, income level, location) of individuals receiving assistance to coordinate target aid programs.
🗓️ Volunteer Coordination & Tasks
Skills & Availability: Database tracking volunteer availabilities (weekends, part-time, full-time) and specialized skills.
Task Assignment: Interactive checklist board allowing administrators/managers to assign specific tasks (with priority levels) to volunteers.
💻 3. Technology Stack
Frontend: React.js (bundled with Vite) for fast rendering and fluid navigation.
Database: Supabase (PostgreSQL) with custom RLS rules.
Automation: Custom PL/pgSQL database triggers that automatically calculate financial totals and synchronize user registrations.
