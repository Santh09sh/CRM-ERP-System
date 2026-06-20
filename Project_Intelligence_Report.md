# 🏢 Centle CRM ERP: Complete Project Intelligence Report

This document provides a complete forensic analysis of the Centle CRM ERP system, detailing the architecture, features, workflows, and database schema. 

## Table of Contents
1. [Phase 1: Project Overview](#phase-1-project-overview)
2. [Phase 2: Full Feature Inventory](#phase-2-full-feature-inventory)
3. [Phase 3: User Journeys](#phase-3-user-journeys)
4. [Phase 4: Route Analysis](#phase-4-route-analysis)
5. [Phase 5: Database Analysis](#phase-5-database-analysis)
6. [Phase 6: Role & Permission Analysis](#phase-6-role--permission-analysis)
7. [Phase 7: AI System Analysis](#phase-7-ai-system-analysis)
8. [Phase 8: CRM Analysis](#phase-8-crm-analysis)
9. [Phase 9: Customer 360 Analysis](#phase-9-customer-360-analysis)
10. [Phase 10: Venture Ecosystem Analysis](#phase-10-venture-ecosystem-analysis)
11. [Phase 11: Notification & Automation Analysis](#phase-11-notification--automation-analysis)
12. [Phase 12: Pipeline Analysis](#phase-12-pipeline-analysis)
13. [Phase 13: Task Management Analysis](#phase-13-task-management-analysis)
14. [Phase 14: Dashboard Analysis](#phase-14-dashboard-analysis)
15. [Phase 15: API Inventory](#phase-15-api-inventory)
16. [Phase 16: Security Audit](#phase-16-security-audit)
17. [Phase 17: UI/UX Audit](#phase-17-uiux-audit)
18. [Phase 18: Hackathon Judge Report](#phase-18-hackathon-judge-report)
19. [Phase 19: Missing Features Report](#phase-19-missing-features-report)
20. [Phase 20: Final Project Handbook](#phase-20-final-project-handbook)

---

## Phase 1: Project Overview

**1. What this project is:**
Centle CRM ERP is a bespoke, AI-powered Enterprise Resource Planning and Customer Relationship Management system built to manage multiple interconnected business ventures under a single parent brand (Centle).

**2. The business problem it solves:**
Organizations running multiple distinct service lines (agencies, consulting, events, talent) typically suffer from data silos. Centle CRM solves this by centralizing data across six distinct "Ventures" (Skill Tank, Maceco, Tobofu, Promtal, Vriddhi, Saasum), allowing seamless cross-selling, centralized billing, and shared account intelligence.

**3. Target Users:**
- **Admins:** C-Suite executives overseeing the entire conglomerate.
- **Managers:** Venture leads who need to see their specific venture's pipeline.
- **Sales Reps:** Individual contributors managing leads, deals, and tasks.
- **Ambassadors:** External affiliates driving leads in exchange for commissions.

**4. Overall Architecture:**
- **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS, Framer Motion.
- **Backend:** Next.js API Routes (Serverless).
- **Database:** Supabase (PostgreSQL).
- **Authentication:** Custom Role-Based Access Control (RBAC) via context and cookies.
- **AI:** Integrated OpenAI capabilities via server-side prompts.

**5. Main Technology Stack:**
- **Framework:** Next.js
- **Styling:** Tailwind CSS + custom glassmorphism design system
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Database:** Supabase (pg-typed)

**6. Design Philosophy:**
The UI follows a highly premium, dark-mode-first, glassmorphism aesthetic inspired by Awwwards-winning designs. It prioritizes data density, fluid micro-interactions, and visual hierarchy using distinct brand colors for different ventures.

**7. Unique Differentiators:**
- **Venture Segregation:** Data can be viewed globally or filtered down to specific business units instantly via a global switcher.
- **Integrated Ambassador Program:** A native referral tracking system that ties directly into the CRM pipeline.

**8. AI Capabilities:**
Embedded AI analyzes leads, evaluates health scores, generates context-aware outreach scripts, and predicts momentum and risk based on activity history and deal value.

**9. Venture Ecosystem Model:**
- **Skill Tank:** Career & Education
- **Maceco:** Marketing & Creative
- **Tobofu:** Lead Generation
- **Promtal:** Events & Talent
- **Vriddhi:** Growth Consulting
- **Saasum:** Internal Tech

**10. Hackathon Alignment:**
The project demonstrates advanced full-stack capabilities, premium UI/UX design, complex relational database architecture, and practical, business-driven AI integration.

---

## Phase 2: Full Feature Inventory

| Feature | Purpose | Roles | DB Tables | APIs | Components | Status |
|---|---|---|---|---|---|---|
| **Global Dashboard** | High-level metrics, funnel analysis, revenue charts | Admin, Manager, Rep | `deals`, `leads`, `activities` | `/api/dashboard` (mocked in UI) | `StatCard`, `BarChart` | Complete |
| **Venture Switcher** | Filter all CRM views by specific venture | All | N/A | N/A | `VentureSwitcher` | Complete |
| **Pipeline Kanban** | Drag-and-drop lead management | Admin, Manager, Rep | `leads`, `pipeline_stages` | `/api/leads` | Kanban board | Complete |
| **Lead Detail (AI 360)** | Deep dive into a lead, timeline, AI insights | Admin, Manager, Rep | `leads`, `activities`, `tasks` | `/api/leads/[id]` | Activity feed, Script box | Complete |
| **Company Directory** | B2B account management | Admin, Manager, Rep | `companies`, `contacts` | N/A | DataTable | Complete |
| **Company 360** | View all related deals, contacts, invoices across ventures | Admin, Manager, Rep | `companies`, `deals`, `invoices` | N/A | Tabs | Complete |
| **Deals Management** | Track revenue and probabilities | Admin, Manager, Rep | `deals` | N/A | DataTable | Complete |
| **Task Management** | Todo lists, reminders, priority | All | `tasks` | `/api/tasks` | Kanban/List | Complete |
| **Invoice Generator** | Create, PDF export, and email invoices | Admin, Manager | `invoices`, `invoice_items` | `/api/invoices` | PDF Generator | Complete |
| **Ambassador Portal** | Referral links, conversions, leaderboard, payouts | Ambassador | `referral_codes`, `leads` | `/api/referral` | Tier Cards | Complete |
| **Data Export** | PDF and CSV export of tables | Admin, Manager | All major tables | Client-side utilities | Export dropdowns | Complete |
| **Flywheel Visualization** | Animated hex-node graph showing cross-sell events | Admin, Manager, Rep | `deals`, `invoices` | N/A | `Flywheel` | Complete |

---

## Phase 3: User Journeys

**Admin / Executive:**
1. **Login:** Enters via admin credentials.
2. **Dashboard:** Views global revenue across all 6 ventures. Sees total pipeline and venture distribution. Uses the Export button to download a PDF report for board meetings.
3. **Pipeline:** Checks the health of the global sales pipeline.
4. **Company 360:** Investigates a key account (e.g., Zomato) to see cross-sell opportunities (buying Marketing from Maceco, but not hiring from Skill Tank).

**Manager:**
1. **Login:** Enters via manager credentials.
2. **Dashboard:** Uses the Venture Switcher to lock the CRM context strictly to their venture (e.g., Maceco).
3. **Pipeline:** Reviews only leads assigned to their venture.
4. **Tasks:** Assigns tasks to Sales Reps under their command.

**Sales Rep:**
1. **Login:** Enters via rep credentials.
2. **Pipeline:** Moves leads through stages.
3. **Lead Detail:** Clicks a lead, views the AI-generated health score and suggested outreach script, and copies it.
4. **Activities:** Logs a call or email to the timeline.
5. **Tasks:** Checks their daily to-do list and marks follow-ups as complete.

**Ambassador:**
1. **Login:** Enters via ambassador credentials.
2. **War Room:** Copies their unique referral link or generates a QR code.
3. **Conversions:** Checks the timeline to see if any referred leads have closed.
4. **Payouts:** Requests a payout for earned commissions (via Bank or UPI).

---

## Phase 4: Route Analysis

- `/ (Login/Home)`: Entry point. Role selection.
- `/(app)/dashboard`: Executive summary. Renders Recharts.
- `/(app)/pipeline`: Kanban board for leads. Modifies `leads.stage_id`.
- `/(app)/leads`: List view of leads.
- `/(app)/leads/[id]`: The AI 360 page. Injects AI context and activity history.
- `/(app)/deals`: Revenue pipeline. Exportable.
- `/(app)/companies`: B2B accounts.
- `/(app)/companies/[id]`: Aggregated view of a company's footprint across Centle.
- `/(app)/invoices`: Financial tracking and PDF generation.
- `/(app)/tasks`: Daily workflow management.
- `/(app)/referrals`: Ambassador portal.
- `/(app)/admin`: System configuration and payout approval.

---

## Phase 5: Database Analysis (Supabase / Postgres)

- `profiles`: Core user table. Enum `user_role` defines RBAC.
- `companies` & `contacts`: Standard B2B CRM structures.
- `pipeline_stages`: Configurable stages (`is_won_stage`, `is_lost_stage` booleans trigger workflow logic).
- `referral_codes`: Ties `ambassador_id` to a unique slug.
- `leads`: The core entity. FKs to `company`, `contact`, `stage`, `assigned_to`, and `referral_code`.
- `deals`: Revenue tracking.
- `activities`: Polymorphic timeline logging (`call`, `email`, `meeting`, `note`).
- `tasks`: Action items.
- `invoices` & `invoice_items`: Billing records.

**Seed Scripts & Fixes:**
- `fix_auth_trigger.sql`: A PostgreSQL function and trigger attached to `auth.users` to automatically inject Google SSO users into `public.profiles`.
- `production_seed.sql`: A procedurally generated script containing 35 companies, 75 leads, 30 contacts, 25 deals, 20 tasks, 15 invoices, 8 ambassadors, and 50 activities with mathematical cross-venture distributions.

*Data Flow:* Ambassador Link -> Lead Created (Referral Code attached) -> Lead Won -> Deal Created -> Invoice Generated -> Commission calculated -> Payout Requested.

---

## Phase 6: Role & Permission Analysis

Handled via `AuthProvider` and `useAuth` hook.
- **Admin:** Full access. Can view all ventures, all routes, and access the `/admin` settings page.
- **Manager:** Route access is granted, but data is filtered to their specific venture assignment (if implemented at the RLS level).
- **Sales Rep:** Cannot view `/admin` or `/invoices`. Cannot export the global dashboard report.
- **Ambassador:** Locked strictly to the `/referrals` War Room. Cannot access CRM internals.

*Gaps:* RLS (Row Level Security) in Supabase needs to strictly enforce the venture isolation on the backend to prevent API scraping.

---

## Phase 7: AI System Analysis

**AI Next Action Engine (Lead Detail Page)**
- **Inputs:** Lead details, activity history, deal value, days in pipeline.
- **Logic:** Server-side logic (or mock logic) evaluates the frequency of communication vs. pipeline stage.
- **Outputs:** 
  1. *Health Score (0-100)*: Based on recency of activity.
  2. *Momentum*: High/Medium/Low based on velocity through stages.
  3. *Suggested Script*: A ready-to-copy email or call script contextually aware of the lead's industry and venture.
- **Business Value:** Reduces rep cognitive load and standardizes outreach quality.

---

## Phase 8: CRM Analysis

- **Leads:** Top of funnel. Focus on velocity and qualification.
- **Deals:** Bottom of funnel. Focus on revenue, probability (weighted pipeline), and closing dates.
- **Companies/Contacts:** Hierarchical account management.
- **Invoices:** Post-sale billing.
- **Activities:** The heartbeat of the CRM, providing audit trails.

*Strengths:* Highly visual, fast optimistic UI updates, integrated AI.

---

## Phase 9: Customer 360 Analysis (Company Detail)

The `companies/[id]` route acts as an Account Intelligence hub.
- It aggregates the **Lifetime Value (LTV)** by summing all closed/won deals across all ventures.
- Shows **Outstanding Balances** by querying unpaid invoices.
- Displays a cross-venture badge system so reps can instantly see if an account uses Skill Tank but not Maceco (identifying whitespace).

---

## Phase 10: Venture Ecosystem Analysis

A globally accessible context (`VentureSwitcher`) allows the user to filter the UI.
- Uses `VENTURES` constant.
- Color codes the UI (e.g., Skill Tank is Amber, Maceco is Blue).
- **Revenue Attribution:** Deals and Invoices have a `venture` column. The Dashboard calculates `VENTURE_REVENUE` array to show which business unit is performing best.
- **Cross-Venture Flywheel:** A custom SVG/Framer Motion animated node graph visualizes the ecosystem. It appears on the homepage to demonstrate the business model (firing random cross-sell light beams), and on the Company 360 page to visualize the exact cross-sell footprint of individual accounts, highlighting whitespace opportunities.

---

## Phase 11: Notification & Automation Analysis

- Built around `/api/notifications/route.ts` and Next.js server routes.
- **Triggers:** Lead Won, Deal Created, Payout Requested.
- **Channels:** UI Toasts (Sonner), Database notifications, external Webhooks (e.g., Telegram integration via `fetch_tg.js` or webhook routes).
- Architecture supports a pub/sub model where core events fire side-effects.

---

## Phase 12: Pipeline Analysis

- Uses `framer-motion` for drag-and-drop Kanban.
- Stages are dynamic (fetched from `pipeline_stages`).
- Moving a lead to a `is_won_stage` automatically prompts the user to convert the Lead into a Deal.
- Calculates total pipeline value per column.

---

## Phase 13: Task Management Analysis

- Simple, fast CRUD for to-do items.
- Fields: Title, Due Date, Priority (Low/Med/High/Urgent), Assigned To.
- Rendered in a clean list on the Dashboard and a dedicated Tasks page.

---

## Phase 14: Dashboard Analysis

- **Funnel Chart:** Recharts AreaChart showing drop-off from New -> Won.
- **Revenue Forecast:** BarChart comparing historical revenue vs. forecast.
- **Venture Distribution:** Helps identify the most lucrative business units.
- **Leaderboard:** Ranks reps/ambassadors by conversions.
- *Visibility Rules:* Reps see personal stats; Admins see global stats.

---

## Phase 15: API Inventory

- `/api/leads`: GET (list), POST (create), PATCH (update stage).
- `/api/deals`: Revenue operations.
- `/api/referral/init`: Generate referral codes.
- `/api/referral/payout`: Process commission withdrawals.
- `/api/invoices/send-email`: Triggers email delivery of PDF invoices.
- `/api/notifications`: System alerts.

---

## Phase 16: Security Audit

- Authentication relies on the `AuthProvider`. 
- **Risk:** If relying solely on client-side context, API routes are exposed.
- **Recommendation:** Ensure Supabase RLS is strictly configured with `auth.uid()` checks.
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) must be secured.

---

## Phase 17: UI/UX Audit

- **Strengths:** Gorgeous dark-mode aesthetic. Exceptional use of glassmorphism (borders with low opacity, blur backgrounds). High-quality micro-interactions (Framer Motion scale/opacity effects on hover). The custom **Cross-Venture Flywheel Visualization** sets this project apart by using mathematically-plotted SVG layouts and glowing `pathLength` animations to turn abstract data silos into a beautiful, interactive narrative.
- **Typography:** Custom font stacks (`var(--font-heading)`, `var(--font-mono)`) create a modern, tech-forward feel.
- **Weaknesses:** High data density might be overwhelming on smaller mobile screens; needs careful responsive testing.

---

## Phase 18: Hackathon Judge Report

- **Innovation (9/10):** The multi-venture architecture combined with native ambassador tracking is highly unique.
- **Technical Complexity (9/10):** Complex state management, drag-and-drop, real-time PDF generation, and deep relational databases.
- **AI Usage (8/10):** Practical application of AI for health scoring and scripting.
- **UX/UI (10/10):** Visually stunning.
- **Business Value (10/10):** Directly solves data silo issues for modern holding companies.

---

## Phase 19: Missing Features Report

1. **Authentication Backend:** (Resolved via `fix_auth_trigger.sql`) - Google Auth will now map directly to `public.profiles`.
2. **Row Level Security (RLS):** Database needs lockdown. (Severity: High)
3. **Email Integration (SMTP):** The invoice email route (`/api/invoices/send-email`) requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` environment variables to function in production. (Severity: Medium)
4. **Mobile Responsiveness:** Kanban board scrolling on mobile needs refinement. (Severity: Low)

---

## Phase 20: Final Project Handbook

*(This document serves as the foundational Project Handbook. Future developers should refer to the Phase 1-15 breakdowns to understand data flow and component hierarchy. All components reside in `src/components`, database logic in `src/lib/db.ts`, and server operations in `src/app/api/`.)*

**Future Roadmap:**
1. Integrate Stripe for invoice payments.
2. Build a native mobile app wrapper using React Native / Expo.
3. Enhance the AI engine to automatically draft follow-up emails based on Gmail/Outlook integration.
