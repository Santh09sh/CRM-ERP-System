export const VENTURES = {
  skill_tank: {
    name: "Skill Tank",
    type: "Career & Education",
    tagline: "India's career accelerator for students seeking internships and placements.",
    url: "https://centle.in/skilltank/",
    color: "#fbbf24", // Amber 400
    logo: "/logos/skill_tank.png",
  },
  maceco: {
    name: "Maceco",
    type: "Marketing & Creative",
    tagline: "Full-service marketing and creative agency for modern brands.",
    url: "https://centle.in/maceco/",
    color: "#60a5fa", // Blue 400
    logo: "/logos/maceco.png",
  },
  tobofu: {
    name: "Tobofu",
    type: "Lead Generation",
    tagline: "Top-of-funnel lead generation and demand creation platform.",
    url: "https://centle.in/tobofu/",
    color: "#a78bfa", // Violet 400
    logo: "/logos/tobofu.png",
  },
  promtal: {
    name: "Promtal",
    type: "Events & Talent",
    tagline: "Promotional talent and events management for brands and campuses.",
    url: "https://centle.in/promtal/",
    color: "#fb7185", // Rose 400
    logo: "/logos/promtal.png",
  },
  vriddhi: {
    name: "Vriddhi",
    type: "Growth Consulting",
    tagline: "Growth consulting and business acceleration for SMEs and startups.",
    url: "https://centle.in/vriddhi/",
    color: "#34d399", // Emerald 400
    logo: "/logos/vriddhi.png",
  },
  saasum: {
    name: "Saasum",
    type: "Internal Tech",
    tagline: "Internal IT and technology arm powering tools across the Centle ecosystem.",
    url: "https://centle.in/saasum/",
    color: "#E54D4C",
    logo: "/logos/saasum.png",
  },
} as const;


export type VentureKey = keyof typeof VENTURES;

export const PIPELINE_STAGES_DEFAULT = [
  { name: "New", display_order: 1, color: "#A3A3A3", is_won_stage: false, is_lost_stage: false },
  { name: "Contacted", display_order: 2, color: "#D4D4D4", is_won_stage: false, is_lost_stage: false },
  { name: "Qualified", display_order: 3, color: "#F5F5F5", is_won_stage: false, is_lost_stage: false },
  { name: "Proposal", display_order: 4, color: "#FFFFFF", is_won_stage: false, is_lost_stage: false },
  { name: "Negotiation", display_order: 5, color: "#F5F5F5", is_won_stage: false, is_lost_stage: false },
  { name: "Won", display_order: 6, color: "#22C55E", is_won_stage: true, is_lost_stage: false },
  { name: "Lost", display_order: 7, color: "#EF4444", is_won_stage: false, is_lost_stage: true },
] as const;

export const LEAD_SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "ads", label: "Ads" },
  { value: "organic", label: "Organic" },
  { value: "event", label: "Event" },
  { value: "cold_call", label: "Cold Call" },
  { value: "website_form", label: "Website Form" },
  { value: "manual", label: "Manual Entry" },
] as const;

export const ACTIVITY_TYPES = [
  { value: "call", label: "Call", icon: "Phone" },
  { value: "email", label: "Email", icon: "Mail" },
  { value: "meeting", label: "Meeting", icon: "Users" },
  { value: "note", label: "Note", icon: "FileText" },
  { value: "task", label: "Task", icon: "CheckSquare" },
] as const;

export const PRIORITY_LABELS = {
  1: { label: "Low", color: "#A3A3A3" },
  2: { label: "Medium", color: "#D4D4D4" },
  3: { label: "High", color: "#F5F5F5" },
  4: { label: "Urgent", color: "#EF4444" },
} as const;

export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales_rep", label: "Sales Rep" },
  { value: "ambassador", label: "Ambassador" },
] as const;

export const HOMEPAGE_QUESTIONS = {
  step1: {
    question: "Who are you?",
    options: [
      { value: "student", label: "Student", description: "Looking for courses, internships, or placements" },
      { value: "company", label: "Company", description: "Seeking talent, marketing, or growth solutions" },
      { value: "college", label: "College", description: "Partnering for campus programs and placements" },
      { value: "individual", label: "Individual", description: "Exploring freelance or consulting opportunities" },
    ],
  },
  step2: {
    student: {
      question: "What are you looking for?",
      options: [
        { value: "internship", label: "Internship", venture: "skill_tank" },
        { value: "course", label: "Upskilling Course", venture: "skill_tank" },
        { value: "placement", label: "Job Placement", venture: "skill_tank" },
        { value: "campus_event", label: "Campus Events", venture: "promtal" },
      ],
    },
    company: {
      question: "What does your business need?",
      options: [
        { value: "leads", label: "Lead Generation", venture: "tobofu" },
        { value: "marketing", label: "Marketing & Branding", venture: "maceco" },
        { value: "growth", label: "Growth Consulting", venture: "vriddhi" },
        { value: "hiring", label: "Talent Hiring", venture: "skill_tank" },
      ],
    },
    college: {
      question: "What are you interested in?",
      options: [
        { value: "placement_drive", label: "Placement Drives", venture: "skill_tank" },
        { value: "campus_ambassador", label: "Campus Ambassador Program", venture: "promtal" },
        { value: "workshops", label: "Workshops & Events", venture: "promtal" },
        { value: "partnerships", label: "Industry Partnerships", venture: "vriddhi" },
      ],
    },
    individual: {
      question: "How can we help you?",
      options: [
        { value: "freelance", label: "Freelance Opportunities", venture: "maceco" },
        { value: "referral", label: "Referral Program", venture: "saasum" },
        { value: "consulting", label: "Business Consulting", venture: "vriddhi" },
        { value: "upskill", label: "Skill Development", venture: "skill_tank" },
      ],
    },
  },
} as const;
