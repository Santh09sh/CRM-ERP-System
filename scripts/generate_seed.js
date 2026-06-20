const fs = require('fs');
const crypto = require('crypto');

// Helpers
const uuid = () => crypto.randomUUID();
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBoolean = () => Math.random() > 0.5;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();

const VENTURES = ['skill_tank', 'maceco', 'tobofu', 'promtal', 'vriddhi', 'saasum'];

// Realistic Indian Data Arrays
const INDIAN_COMPANIES = [
  "Tata Consultancy Services", "Reliance Industries", "Infosys", "Wipro", "HCLTech", 
  "Tech Mahindra", "Zomato", "Swiggy", "Flipkart", "Paytm", "Zerodha", "Razorpay", 
  "CRED", "Ola Cabs", "Oyo Rooms", "Lenskart", "Nykaa", "Urban Company", "Delhivery", 
  "MakeMyTrip", "PolicyBazaar", "Dream11", "Pine Labs", "Udaan", "ShareChat",
  "Mahindra & Mahindra", "Larsen & Toubro", "Bajaj Auto", "Hero MotoCorp", "Maruti Suzuki",
  "Sun Pharma", "Dr. Reddy's Labs", "Cipla", "Biocon", "Godrej Consumer Products"
];

const INDUSTRIES = ["IT Services", "E-commerce", "Fintech", "Automotive", "Healthcare", "EdTech", "Logistics", "Consumer Goods", "Travel"];

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Gurgaon", "Noida", "Ahmedabad"];

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyaansh", "Ayaan", "Krishna", "Ishaan", 
                     "Diya", "Isha", "Kavya", "Aanya", "Ananya", "Riya", "Sneha", "Neha", "Pooja", "Anjali", "Vikram", "Rahul"];

const LAST_NAMES = ["Sharma", "Patel", "Reddy", "Singh", "Kumar", "Gupta", "Desai", "Jain", "Mehta", "Bose", 
                    "Chowdhury", "Mukherjee", "Nair", "Menon", "Pillai", "Iyer", "Rao", "Das", "Yadav"];

const TITLES = ["CEO", "CTO", "Marketing Director", "VP Sales", "HR Head", "Operations Manager", "Founder", "Product Manager"];

const PIPELINE_STAGES = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Lead In" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Contact Made" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Meeting Set" },
  { id: "00000000-0000-0000-0000-000000000004", name: "Proposal Sent" },
  { id: "00000000-0000-0000-0000-000000000005", name: "Negotiation" },
  { id: "00000000-0000-0000-0000-000000000006", name: "Closed Won" },
  { id: "00000000-0000-0000-0000-000000000007", name: "Closed Lost" }
];

const ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"; // The default admin from schema

let sql = `-- ======================================================
-- 🚀 CENTLE CRM PRODUCTION SEED DATASET
-- Generated with mathematical cross-venture distributions
-- ======================================================

-- Disable foreign key constraint on profiles to allow dummy data insertion
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure required columns exist in the tasks table (fixes schema sync issues)
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS venture TEXT DEFAULT 'core';
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS lead_name TEXT;

-- Ensure default Admin user exists
INSERT INTO profiles (id, full_name, email, role) VALUES 
('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@saasum.in', 'admin') 
ON CONFLICT DO NOTHING;

-- Ensure Pipeline Stages exist
INSERT INTO pipeline_stages (id, name, display_order, color, is_won_stage, is_lost_stage) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Lead In', 1, '#60A5FA', false, false),
    ('00000000-0000-0000-0000-000000000002', 'Contact Made', 2, '#A78BFA', false, false),
    ('00000000-0000-0000-0000-000000000003', 'Meeting Set', 3, '#F472B6', false, false),
    ('00000000-0000-0000-0000-000000000004', 'Proposal Sent', 4, '#FBBF24', false, false),
    ('00000000-0000-0000-0000-000000000005', 'Negotiation', 5, '#FB923C', false, false),
    ('00000000-0000-0000-0000-000000000006', 'Closed Won', 6, '#4ADE80', true, false),
    ('00000000-0000-0000-0000-000000000007', 'Closed Lost', 7, '#F87171', false, true)
ON CONFLICT DO NOTHING;

`;

// Escape quotes helper
const escapeSql = (str) => {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
};

async function generate() {
  // 1. AMBASSADORS (8)
  const ambassadors = [];
  sql += `-- 1. AMBASSADORS\n`;
  for(let i=0; i<8; i++) {
    const id = uuid();
    const fn = randomElement(FIRST_NAMES);
    const ln = randomElement(LAST_NAMES);
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.in`;
    
    sql += `INSERT INTO profiles (id, full_name, email, role) VALUES (${escapeSql(id)}, ${escapeSql(name)}, ${escapeSql(email)}, 'ambassador') ON CONFLICT DO NOTHING;\n`;
    ambassadors.push({ id, name });
  }

  // Referral Codes (1 per ambassador)
  const referralCodes = [];
  for(const amb of ambassadors) {
    const id = uuid();
    const slug = amb.name.split(' ')[0].toLowerCase() + randomNumber(100, 999);
    sql += `INSERT INTO referral_codes (id, ambassador_id, code, link_slug, total_clicks) VALUES (${escapeSql(id)}, ${escapeSql(amb.id)}, ${escapeSql(slug.toUpperCase())}, ${escapeSql(slug)}, ${randomNumber(10, 150)});\n`;
    referralCodes.push(id);
  }
  sql += `\n`;

  // 2. COMPANIES (35)
  const companies = [];
  sql += `-- 2. COMPANIES\n`;
  for(let i=0; i<35; i++) {
    const id = uuid();
    const name = INDIAN_COMPANIES[i]; // Use exactly the 35 we defined
    const ind = randomElement(INDUSTRIES);
    const domain = name.split(' ')[0].toLowerCase() + ".in";
    const city = randomElement(CITIES);
    const venture = randomElement(VENTURES);
    
    sql += `INSERT INTO companies (id, name, industry, website, address, created_by, notes) VALUES (${escapeSql(id)}, ${escapeSql(name)}, ${escapeSql(ind)}, ${escapeSql(domain)}, ${escapeSql(city + ", India")}, ${escapeSql(ADMIN_USER_ID)}, '{"venture":"${venture}"}');\n`;
    companies.push({ id, name, venture });
  }
  sql += `\n`;

  // 3. CONTACTS (30)
  const contacts = [];
  sql += `-- 3. CONTACTS\n`;
  for(let i=0; i<30; i++) {
    const id = uuid();
    const fn = randomElement(FIRST_NAMES);
    const ln = randomElement(LAST_NAMES);
    const comp = randomElement(companies);
    const title = randomElement(TITLES);
    const email = `${fn.toLowerCase()}@example.in`;
    const phone = `+91 9${randomNumber(100000000, 999999999)}`;
    
    sql += `INSERT INTO contacts (id, first_name, last_name, email, phone, job_title, company_id, created_by) VALUES (${escapeSql(id)}, ${escapeSql(fn)}, ${escapeSql(ln)}, ${escapeSql(email)}, ${escapeSql(phone)}, ${escapeSql(title)}, ${escapeSql(comp.id)}, ${escapeSql(ADMIN_USER_ID)});\n`;
    contacts.push(id);
  }
  sql += `\n`;

  // 4. LEADS (75)
  const leads = [];
  sql += `-- 4. LEADS\n`;
  for(let i=0; i<75; i++) {
    const id = uuid();
    const comp = randomElement(companies);
    const venture = randomElement(VENTURES);
    const PROJECT_TYPES = ["Implementation", "Migration", "Consulting", "Audit", "Integration", "Deployment", "Optimization", "Upgrade"];
    const title = `${comp.name} - ${venture.charAt(0).toUpperCase() + venture.slice(1)} ${randomElement(PROJECT_TYPES)}`;
    const stage = randomElement(PIPELINE_STAGES);
    const value = randomNumber(50000, 5000000);
    const priority = randomNumber(1, 4);
    const source = randomElement(['referral', 'ads', 'organic', 'event', 'cold_call']);
    const refCodeId = source === 'referral' ? randomElement(referralCodes) : null;
    
    sql += `INSERT INTO leads (id, title, source, company_id, stage_id, assigned_to, estimated_value, priority, custom_fields, referral_code_id, venture) VALUES (${escapeSql(id)}, ${escapeSql(title)}, ${escapeSql(source)}, ${escapeSql(comp.id)}, ${escapeSql(stage.id)}, ${escapeSql(ADMIN_USER_ID)}, ${value}, ${priority}, '{"venture":"${venture}"}'::jsonb, ${refCodeId ? escapeSql(refCodeId) : 'NULL'}, ${escapeSql(venture)});\n`;
    leads.push({ id, company_id: comp.id, venture, stage, value, refCodeId });
  }
  sql += `\n`;

  // 5. STAGE HISTORY
  sql += `-- 5. STAGE HISTORY\n`;
  for(const lead of leads) {
    if(lead.stage.name !== "Lead In") {
      sql += `INSERT INTO stage_history (lead_id, from_stage_id, to_stage_id, changed_by) VALUES (${escapeSql(lead.id)}, ${escapeSql(PIPELINE_STAGES[0].id)}, ${escapeSql(lead.stage.id)}, ${escapeSql(ADMIN_USER_ID)});\n`;
    }
  }
  sql += `\n`;

  // 6. DEALS (25) & CONVERSIONS
  const deals = [];
  sql += `-- 6. DEALS (from Won Leads or Direct)\n`;
  for(let i=0; i<25; i++) {
    const id = uuid();
    const lead = randomElement(leads); // Let's link most deals to leads
    const title = `Deal: ${lead.title}`;
    const value = lead.value;
    const probability = randomNumber(40, 100);
    const status = probability > 80 ? 'won' : (probability < 50 ? 'open' : 'open');
    const closeDate = new Date(Date.now() + randomNumber(-30, 60) * 86400000).toISOString().split('T')[0];
    
    sql += `INSERT INTO deals (id, title, lead_id, company_id, assigned_to, value, probability, expected_close_date, status) VALUES (${escapeSql(id)}, ${escapeSql(title)}, ${escapeSql(lead.id)}, ${escapeSql(lead.company_id)}, ${escapeSql(ADMIN_USER_ID)}, ${value}, ${probability}, ${escapeSql(closeDate)}, ${escapeSql(status)});\n`;
    deals.push({ id, company_id: lead.company_id, value, status, lead_id: lead.id });

    // If deal is won and lead had referral code, create a conversion
    if(status === 'won' && lead.refCodeId) {
       sql += `INSERT INTO referral_conversions (referral_code_id, lead_id, deal_id, deal_value, commission_amount, status) VALUES (${escapeSql(lead.refCodeId)}, ${escapeSql(lead.id)}, ${escapeSql(id)}, ${value}, ${value * 0.10}, 'approved');\n`;
    }
  }
  sql += `\n`;

  // 7. INVOICES (15)
  sql += `-- 7. INVOICES\n`;
  for(let i=0; i<15; i++) {
    const id = uuid();
    const deal = randomElement(deals.filter(d => d.status === 'won'));
    if(!deal) continue;

    const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const invNum = `INV-2026-${randomSuffix}`;
    const subtotal = deal.value;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    const status = randomElement(['paid', 'paid', 'sent', 'overdue', 'draft']);
    const issueDate = new Date(Date.now() - randomNumber(5, 45) * 86400000).toISOString().split('T')[0];
    const dueDate = new Date(new Date(issueDate).getTime() + 15 * 86400000).toISOString().split('T')[0];
    
    sql += `INSERT INTO invoices (id, invoice_number, deal_id, company_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date) VALUES (${escapeSql(id)}, ${escapeSql(invNum)}, ${escapeSql(deal.id)}, ${escapeSql(deal.company_id)}, ${escapeSql(ADMIN_USER_ID)}, ${subtotal}, 18, ${tax}, ${total}, ${escapeSql(status)}, ${escapeSql(issueDate)}, ${escapeSql(dueDate)});\n`;

    // Invoice item
    sql += `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (${escapeSql(id)}, 'Professional Services rendered', 1, ${subtotal}, ${subtotal});\n`;
  }
  sql += `\n`;

  // 8. TASKS (20)
  sql += `-- 8. TASKS\n`;
  for(let i=0; i<20; i++) {
    const id = uuid();
    const lead = randomElement(leads);
    const title = randomElement(["Follow up call", "Send proposal draft", "Schedule demo", "Discuss pricing", "Check-in"]);
    const priority = randomElement(['low', 'medium', 'high', 'urgent']);
    const status = randomElement(['pending', 'in_progress', 'completed']);
    const dueDate = new Date(Date.now() + randomNumber(-5, 10) * 86400000).toISOString();
    
    sql += `INSERT INTO tasks (id, title, assigned_to, lead_id, priority, status, due_date, venture, lead_name) VALUES (${escapeSql(id)}, ${escapeSql(title)}, ${escapeSql(ADMIN_USER_ID)}, ${escapeSql(lead.id)}, ${escapeSql(priority)}, ${escapeSql(status)}, ${escapeSql(dueDate)}, ${escapeSql(lead.venture)}, ${escapeSql(lead.title)});\n`;
  }
  sql += `\n`;

  // 9. ACTIVITIES (50)
  sql += `-- 9. ACTIVITIES\n`;
  for(let i=0; i<50; i++) {
    const lead = randomElement(leads);
    const type = randomElement(['call', 'email', 'meeting', 'note']);
    const subject = `${type.charAt(0).toUpperCase() + type.slice(1)} regarding requirements`;
    const date = new Date(Date.now() - randomNumber(1, 30) * 86400000).toISOString();
    
    sql += `INSERT INTO activities (lead_id, created_by, type, subject, activity_date) VALUES (${escapeSql(lead.id)}, ${escapeSql(ADMIN_USER_ID)}, ${escapeSql(type)}, ${escapeSql(subject)}, ${escapeSql(date)});\n`;
  }

  // Write to file
  fs.writeFileSync('production_seed.sql', sql);
  console.log('Successfully generated production_seed.sql');
}

generate();
