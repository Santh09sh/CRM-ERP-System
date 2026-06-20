const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Fetching deps...");
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const userId = profiles?.[0]?.id;

  const { data: companies } = await supabase.from('companies').select('id, name');
  const getCompanyId = (name) => companies.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id || null;

  const { data: contacts } = await supabase.from('contacts').select('id, first_name');
  const contactId = contacts?.[0]?.id;

  console.log("Deleting old invoices...");
  await supabase.from("invoices").delete().in("invoice_number", [
    'INV-2504-001', 'INV-2504-002', 'INV-2505-001', 'INV-2505-002', 'INV-2506-001',
    'INV-2501-LK1', 'INV-2506-LK2', 'INV-2602-LK3', 'INV-2509-RP1', 'INV-2601-RP2',
    'INV-2606-RP3', 'INV-2505-ZM1', 'INV-2605-ZM2', 'INV-2511-IIT1', 'INV-2512-SB1',
    'INV-2606-SB2', 'INV-2508-GE1', 'INV-2602-FW1', 'INV-2507-BP1'
  ]);

  const invoices = [
    {
      invoice_number: 'INV-2504-001',
      company_id: getCompanyId('Lenskart'),
      contact_id: contactId,
      created_by: userId,
      subtotal: 984000,
      tax_rate: 18,
      tax_amount: 216000,
      total: 1200000,
      status: 'paid',
      issue_date: '2026-04-15',
      due_date: '2026-05-15',
      notes: 'Digital Marketing Strategy',
      venture: 'maceco'
    },
    {
      invoice_number: 'INV-2504-002',
      company_id: getCompanyId('BITS'),
      contact_id: contactId,
      created_by: userId,
      subtotal: 779000,
      tax_rate: 18,
      tax_amount: 171000,
      total: 950000,
      status: 'paid',
      issue_date: '2026-04-20',
      due_date: '2026-05-20',
      notes: 'Internship Program',
      venture: 'skill_tank'
    },
    {
      invoice_number: 'INV-2505-001',
      company_id: getCompanyId('IIT'),
      contact_id: contactId,
      created_by: userId,
      subtotal: 1476000,
      tax_rate: 18,
      tax_amount: 324000,
      total: 1800000,
      status: 'sent',
      issue_date: '2026-05-10',
      due_date: '2026-06-10',
      notes: 'Campus Placement Drive',
      venture: 'skill_tank'
    },
    {
      invoice_number: 'INV-2505-002',
      company_id: getCompanyId('Razorpay'),
      contact_id: contactId,
      created_by: userId,
      subtotal: 2624000,
      tax_rate: 18,
      tax_amount: 576000,
      total: 3200000,
      status: 'draft',
      issue_date: '2026-05-28',
      due_date: '2026-06-28',
      notes: 'B2B Lead Generation',
      venture: 'tobofu'
    },
    {
      invoice_number: 'INV-2506-001',
      company_id: getCompanyId('Sunburn'),
      contact_id: contactId,
      created_by: userId,
      subtotal: 2296000,
      tax_rate: 18,
      tax_amount: 504000,
      total: 2800000,
      status: 'overdue',
      issue_date: '2026-04-01',
      due_date: '2026-05-01',
      notes: 'Festival Brand Activation',
      venture: 'promtal'
    }
  ];

  console.log("Inserting invoices...");
  const { data: invData, error: invErr } = await supabase.from('invoices').insert(invoices).select();
  if (invErr) {
    console.error("Failed to insert invoices", invErr);
    return;
  }
  
  console.log("Invoices inserted:", invData.length);
  
  // Line items
  const itemsMap = {
    'INV-2504-001': [
      { description: 'Social Media Campaign — 3 Months', quantity: 1, unit_price: 600000, total: 600000 },
      { description: 'Influencer Partnership Management', quantity: 1, unit_price: 250000, total: 250000 },
      { description: 'Performance Ad Management', quantity: 3, unit_price: 44667, total: 134000 }
    ],
    'INV-2504-002': [
      { description: 'Placement Drive — 300 Students', quantity: 1, unit_price: 600000, total: 600000 },
      { description: 'Resume & Interview Prep Workshop', quantity: 1, unit_price: 179000, total: 179000 }
    ],
    'INV-2505-001': [
      { description: 'Full Placement Drive Partnership', quantity: 1, unit_price: 1000000, total: 1000000 },
      { description: 'Industry Connect Sessions', quantity: 4, unit_price: 75000, total: 300000 },
      { description: 'Career Readiness Training', quantity: 1, unit_price: 176000, total: 176000 }
    ],
    'INV-2505-002': [
      { description: 'Lead Gen Platform Setup', quantity: 1, unit_price: 1500000, total: 1500000 },
      { description: 'Content Syndication — 6 Months', quantity: 1, unit_price: 624000, total: 624000 },
      { description: 'ABM Campaign (100 Accounts)', quantity: 1, unit_price: 500000, total: 500000 }
    ],
    'INV-2506-001': [
      { description: 'Event Activation Setup & Management', quantity: 1, unit_price: 1500000, total: 1500000 },
      { description: 'Promo Staff — 40 Personnel × 3 Days', quantity: 120, unit_price: 5000, total: 600000 },
      { description: 'Brand Experience Zone Design', quantity: 1, unit_price: 196000, total: 196000 }
    ]
  };

  const lineItems = [];
  for (const inv of invData) {
    const items = itemsMap[inv.invoice_number];
    if (items) {
      items.forEach(it => lineItems.push({ ...it, invoice_id: inv.id }));
    }
  }

  const { error: itemsErr } = await supabase.from('invoice_items').insert(lineItems);
  if (itemsErr) console.error("Failed to insert items", itemsErr);
  else console.log("Success! Items inserted:", lineItems.length);
}

seed();
