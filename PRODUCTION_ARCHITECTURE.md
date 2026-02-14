# Production Architecture: AI Autonomous Recruiter

This document outlines the transition from the current **Testing/MVP** setup to an **Industry Standard** production environment.

## 1. Current Testing vs. Production Standard

| Feature | Current (Testing) | Industry Standard (Production) |
| :--- | :--- | :--- |
| **Data Storage** | Local JSON files (`data/`) | Database (PostgreSQL / MongoDB) |
| **Media Storage** | Local folder (`storage/`) | Object Storage (AWS S3 / Cloudflare R2) |
| **Security** | Plain URL parameters | Encrypted JWT / Signed Tokens |
| **Verification** | Simple string matching | OAuth 2.0 / NextAuth / Magic Links |
| **JD Management** | Manual JSON editing | CMS or Admin Dashboard with RBAC |
| **Scalability** | Single server / Localhost | Serverless (Vercel) + Database Pooling |

---

## 2. Production Roadmap

### A. Secure Interview Links (Signed Tokens)
Instead of `?email=user@example.com`, industry standards use **Signed JWTs** with an expiration time.
- **Mechanism**: The backend generates a token wrapping the `candidate_id` and `jd_id`.
- **Expiration**: The link expires after 48 hours or after 1 successful completion.
- **One-Time Use**: A "Used" flag in the database prevents candidates from restarting the interview multiple times.

### B. Persistent Database (Postgres + Prisma)
Replace `candidates.json` with a relational database.
- **Tables**: `Candidates`, `Jobs`, `InterviewSessions`, `Feedback`.
- **Benefit**: Faster queries, complex relationships (one candidate for multiple jobs), and transactional integrity.

### C. Cloud Storage (S3/R2)
Video recordings and JSON feedback should NOT live on the application server.
- **Why?**: Local storage fills up disks and is lost during server redeploys.
- **Solution**: Use **Signed Upload URLs**. The frontend uploads the video directly to S3, and the backend only saves the URL.

### D. Advanced AI Safety & Monitoring
- **Prompt Injection Protection**: Hardening the `instruction.md` system prompt.
- **Observability**: Using tools like **Sentry** for frontend crashes and **LangSmith** or **Helicone** to monitor Vapi/OpenAI latency and costs.

---

## 3. Recommended Tech Stack
- **Frontend/Backend**: Next.js (App Router)
- **Database**: Supabase (Postgres) or Prisma + AWS RDS
- **Auth**: Clerk or NextAuth.js
- **Storage**: AWS S3 or Cloudflare R2
- **Email**: Resend or SendGrid (for JD invites)

## 4. Security Checklist
- [ ] **HTTPS Only**: Ensure all traffic is encrypted.
- [ ] **CORS Policy**: Restrict Vapi tool calls and file uploads to your domain only.
- [ ] **Rate Limiting**: Prevent abuse of the `/api/config` endpoint.
- [ ] **Data Residency**: Ensure candidate data (GDPR/SOC2) is stored in the correct region.
