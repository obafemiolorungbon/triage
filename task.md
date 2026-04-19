Full-Stack Assessment: The "Smart Triage" Ticketing System
Overview
This is a medium-difficulty 4-5 day full-stack assessment.

The goal is to evaluate your end-to-end feature ownership, clean code architecture, testing practices, and AI-augmented development workflow. We are looking for engineers who can take a feature from an idea to a fully functioning, bug-free implementation using Codematic’s "Golden Path" stack.

The Challenge
Customer support teams often waste hours manually categorizing and prioritizing incoming support tickets.

Your task is to build a "Smart Triage" Ticketing System. This system will accept new support tickets from users and automatically use an LLM to assign a category and priority level before presenting them to support agents on a dashboard.

1. Backend Requirements (The "Golden Path")
Choose one: Python (FastAPI) or Node.js (Express).

Core API (CRUD):

POST /tickets: Accepts a new ticket (title, description, customer_email).

GET /tickets: Returns a paginated list of tickets. Must support filtering by status and priority.

PATCH /tickets/:id: Allows a support agent to update the ticket status (e.g., "Open", "In Progress", "Resolved").

Data Persistence: Store tickets in PostgreSQL or MongoDB. Ensure your database schema is normalized and properly indexed for querying.

The "Smart" Integration: When a new ticket is submitted, the backend must make a call to an LLM (Gemini 1.5 Pro/Flash, OpenAI, or Claude). The AI should analyze the description and return:

A category (e.g., "Billing", "Technical Bug", "Feature Request").

A priority (e.g., "High", "Medium", "Low").

Authentication: Implement standard JWT-based authentication so only authenticated "Support Agents" can view and update the dashboard.

2. Frontend Requirements
Use Next.js (App Router) and Tailwind CSS.

Customer Submission Page: A simple, public-facing form where a customer can submit a new ticket.

Agent Dashboard: A protected route requiring authentication. It should display a data table or Kanban board of all tickets.

Interactivity: Support agents must be able to change the status of a ticket directly from the dashboard without a full page reload (Optimistic UI updates).

Standardized UI: Use a consistent design system (e.g., Shadcn/ui) to ensure a clean, accessible, and professional interface.

3. AI-First Workflow (MANDATORY)
At Codematic, we embrace AI coding assistants (Cursor, Gemini, Claude) to boost velocity, but we require engineers to remain the "architect in the loop."

You must document your use of AI in an AI_JOURNEY.md file:

List 3 complex prompts you used to generate boilerplate, write tests, or design the database.

Describe at least one instance where the AI hallucinated, produced inefficient code, or suggested a bad practice, and explain how you caught and fixed it.

The Verification Task:
You must include a brief section in your README.md explaining:

How would you implement Role-Based Access Control (RBAC) if we added "Admins" and "Read-Only" users to this system?

What happens to your system if the LLM API goes down? How did you design your API to handle this failure gracefully?

Deliverables
GitHub Repository: Public or private (please invite pamilerinid, ayo-localhost and john-afolabi).

AI_JOURNEY.md: Documentation of your collaboration with AI tools.

Local Setup: A docker-compose.yml file that spins up the backend, frontend, and database with a single command (docker-compose up).

Testing (Zero-Debt Policy): Evidence of at least 80% code coverage on your core business logic (e.g., the ticket creation and AI parsing logic) using tools like Jest or Pytest.

Note: You are not required to build a full product. We highly value your architectural documentation and end-to-end thinking over a fully completed application. You may mock the LLM calls if you do not have an active Vertex AI setup, but the integration logic and retry mechanisms must be [visible/implemented].