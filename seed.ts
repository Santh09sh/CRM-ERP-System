import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkError(promise: any) {
  const { data, error } = await promise;
  if (error) {
    console.error("DB Error:", error);
    throw new Error(error.message);
  }
  return data;
}

async function seed() {
  console.log("Seeding started...");

  await checkError(supabase.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await checkError(supabase.from("deals").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await checkError(supabase.from("stage_history").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await checkError(supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await checkError(supabase.from("contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await checkError(supabase.from("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await checkError(supabase.from("pipeline_stages").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  // 2. Profiles / Users
  const profilesData = [
    { email: "priya@example.com", full_name: "Priya Sharma", role: "sales_rep" },
    { email: "arjun@example.com", full_name: "Arjun Mehta", role: "sales_rep" },
    { email: "sneha@example.com", full_name: "Sneha Reddy", role: "sales_rep" },
  ];
  
  const profileIdMap: Record<string, string> = {};
  for (const p of profilesData) {
    // 1. Create auth user
    const { data: userAuth, error: authErr } = await supabase.auth.admin.createUser({
      email: p.email,
      password: "password123",
      email_confirm: true,
      user_metadata: { full_name: p.full_name, role: p.role },
    });
    
    // If it fails because user already exists, let's just find them
    let userId = userAuth?.user?.id;
    if (!userId) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      userId = listData?.users.find(u => u.email === p.email)?.id;
    }

    if (userId) {
      profileIdMap[p.full_name] = userId;
      // 2. Upsert profile
      await checkError(supabase.from("profiles").upsert({
        id: userId,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
      }));
    }
  }

  const getProfileId = (name: string) => profileIdMap[name];

  const stagesData = [
    { name: "New", display_order: 1, color: "#A3A3A3", is_won_stage: false },
    { name: "Contacted", display_order: 2, color: "#D4D4D4", is_won_stage: false },
    { name: "Qualified", display_order: 3, color: "#F5F5F5", is_won_stage: false },
    { name: "Proposal", display_order: 4, color: "#FFFFFF", is_won_stage: false },
    { name: "Negotiation", display_order: 5, color: "#F5F5F5", is_won_stage: false },
    { name: "Won", display_order: 6, color: "#22C55E", is_won_stage: true },
  ];
  const stages = await checkError(supabase.from("pipeline_stages").insert(stagesData).select());
  const getStageId = (order: number) => stages?.find((s: any) => s.display_order === order)?.id;

  const companiesData = [
    { name: "IIT Hyderabad", industry: "Education", notes: JSON.stringify({ venture: "skill_tank" }) },
    { name: "BITS Pilani", industry: "Education", notes: JSON.stringify({ venture: "skill_tank" }) },
    { name: "Zomato", industry: "Food", notes: JSON.stringify({ venture: "maceco" }) },
    { name: "Lenskart", industry: "Retail", notes: JSON.stringify({ venture: "maceco" }) },
    { name: "Razorpay", industry: "Finance", notes: JSON.stringify({ venture: "tobofu" }) },
    { name: "Freshworks", industry: "SaaS", notes: JSON.stringify({ venture: "tobofu" }) },
    { name: "Sunburn Festival", industry: "Events", notes: JSON.stringify({ venture: "promtal" }) },
    { name: "GreenEnergy Labs", industry: "Energy", notes: JSON.stringify({ venture: "vriddhi" }) },
  ];
  const companies = await checkError(supabase.from("companies").insert(companiesData).select());
  const getCompanyId = (name: string) => companies?.find((c: any) => c.name === name)?.id;

  const contactsData = [
    { first_name: "Dr. Anil", last_name: "Kumar", email: "anil@iith.ac.in", phone: "+91 98765 43210", job_title: "Placement Director", company_id: getCompanyId("IIT Hyderabad") },
    { first_name: "Meera", last_name: "Bhatt", email: "meera@bits-pilani.ac.in", phone: "+91 87654 32109", job_title: "Career Services Head", company_id: getCompanyId("BITS Pilani") },
    { first_name: "Rahul", last_name: "Khanna", email: "rahul@zomato.com", phone: "+91 76543 21098", job_title: "VP Marketing", company_id: getCompanyId("Zomato") },
    { first_name: "Priyanka", last_name: "Agarwal", email: "priyanka@lenskart.com", phone: "+91 65432 10987", job_title: "Brand Director", company_id: getCompanyId("Lenskart") },
    { first_name: "Harshil", last_name: "Mathur", email: "harshil@razorpay.com", phone: "+91 54321 09876", job_title: "Head of Growth", company_id: getCompanyId("Razorpay") },
    { first_name: "Girish", last_name: "Mathrubootham", email: "girish@freshworks.com", phone: "+91 43210 98765", job_title: "CEO", company_id: getCompanyId("Freshworks") },
    { first_name: "Karan", last_name: "Singh", email: "karan@sunburn.in", phone: "+91 32109 87654", job_title: "Event Director", company_id: getCompanyId("Sunburn Festival") },
    { first_name: "Divya", last_name: "Menon", email: "divya@greenenergy.in", phone: "+91 21098 76543", job_title: "Director of Engineering", company_id: getCompanyId("GreenEnergy Labs") },
  ];
  const contacts = await checkError(supabase.from("contacts").insert(contactsData).select());
  const getContactId = (email: string) => contacts?.find((c: any) => c.email === email)?.id;

  const leadsData = [
    { title: "IIT Hyderabad Placement", description: "Campus placement drive", estimated_value: 1800000, priority: 3, company_id: getCompanyId("IIT Hyderabad"), contact_id: getContactId("anil@iith.ac.in"), assigned_to: getProfileId("Priya Sharma"), stage_id: getStageId(1), custom_fields: { venture: "skill_tank" } },
    { title: "Zomato Brand Campaign", description: "Full rebranding for Zomato Gold", estimated_value: 2400000, priority: 4, company_id: getCompanyId("Zomato"), contact_id: getContactId("rahul@zomato.com"), assigned_to: getProfileId("Arjun Mehta"), stage_id: getStageId(1), custom_fields: { venture: "maceco" } },
    { title: "Razorpay Lead Gen", description: "B2B merchant demand gen", estimated_value: 3200000, priority: 4, company_id: getCompanyId("Razorpay"), contact_id: getContactId("harshil@razorpay.com"), assigned_to: getProfileId("Priya Sharma"), stage_id: getStageId(2), custom_fields: { venture: "tobofu" } },
    { title: "Sunburn Festival Activation", description: "Brand activation + promo staff", estimated_value: 2800000, priority: 3, company_id: getCompanyId("Sunburn Festival"), contact_id: getContactId("karan@sunburn.in"), assigned_to: getProfileId("Sneha Reddy"), stage_id: getStageId(2), custom_fields: { venture: "promtal" } },
    { title: "GreenEnergy Growth Strategy", description: "Market expansion consulting", estimated_value: 1400000, priority: 4, company_id: getCompanyId("GreenEnergy Labs"), contact_id: getContactId("divya@greenenergy.in"), assigned_to: getProfileId("Arjun Mehta"), stage_id: getStageId(3), custom_fields: { venture: "vriddhi" } },
    { title: "Freshworks Demand Gen", description: "Outbound lead gen for SMB", estimated_value: 1600000, priority: 2, company_id: getCompanyId("Freshworks"), contact_id: getContactId("girish@freshworks.com"), assigned_to: getProfileId("Priya Sharma"), stage_id: getStageId(3), custom_fields: { venture: "tobofu" } },
    { title: "Lenskart Digital Strategy", description: "Social + search + influencer", estimated_value: 1200000, priority: 4, company_id: getCompanyId("Lenskart"), contact_id: getContactId("priyanka@lenskart.com"), assigned_to: getProfileId("Arjun Mehta"), stage_id: getStageId(4), custom_fields: { venture: "maceco" } },
    { title: "MediPharma Scale Plan", description: "Healthcare market expansion", estimated_value: 980000, priority: 3, assigned_to: getProfileId("Priya Sharma"), stage_id: getStageId(5), custom_fields: { venture: "vriddhi" } },
    { title: "BITS Pilani Internships", description: "300+ student placements", estimated_value: 950000, priority: 3, company_id: getCompanyId("BITS Pilani"), contact_id: getContactId("meera@bits-pilani.ac.in"), assigned_to: getProfileId("Sneha Reddy"), stage_id: getStageId(6), custom_fields: { venture: "skill_tank" } },
  ];
  await checkError(supabase.from("leads").insert(leadsData).select());

  const dealsData = [
    { title: "IIT Hyderabad — Campus Placement Drive", value: 1800000, probability: 75, expected_close_date: "2026-07-15", status: "open", company_id: getCompanyId("IIT Hyderabad"), assigned_to: getProfileId("Priya Sharma"), notes: JSON.stringify({ venture: "skill_tank", companyName: "IIT Hyderabad", assignedName: "Priya Sharma" }) },
    { title: "Zomato — Brand Campaign Redesign", value: 2400000, probability: 60, expected_close_date: "2026-08-01", status: "open", company_id: getCompanyId("Zomato"), assigned_to: getProfileId("Arjun Mehta"), notes: JSON.stringify({ venture: "maceco", companyName: "Zomato", assignedName: "Arjun Mehta" }) },
    { title: "Razorpay — B2B Lead Generation", value: 3200000, probability: 40, expected_close_date: "2026-09-30", status: "open", company_id: getCompanyId("Razorpay"), assigned_to: getProfileId("Priya Sharma"), notes: JSON.stringify({ venture: "tobofu", companyName: "Razorpay", assignedName: "Priya Sharma" }) },
    { title: "Sunburn — Festival Brand Activation", value: 2800000, probability: 85, expected_close_date: "2026-07-05", status: "open", company_id: getCompanyId("Sunburn Festival"), assigned_to: getProfileId("Sneha Reddy"), notes: JSON.stringify({ venture: "promtal", companyName: "Sunburn Festival", assignedName: "Sneha Reddy" }) },
    { title: "GreenEnergy — Scale Strategy", value: 1400000, probability: 100, expected_close_date: "2026-06-01", status: "won", company_id: getCompanyId("GreenEnergy Labs"), assigned_to: getProfileId("Arjun Mehta"), notes: JSON.stringify({ venture: "vriddhi", companyName: "GreenEnergy Labs", assignedName: "Arjun Mehta" }) },
  ];
  await checkError(supabase.from("deals").insert(dealsData));

  const tasksData = [
    { title: "Follow up with IIT Hyderabad", description: "Send updated campus placement proposal", status: "pending", priority: "medium", due_date: "2026-06-19", assigned_to: getProfileId("Priya Sharma"), venture: "skill_tank" },
    { title: "Prepare Zomato brand pitch", description: "Finalize the mockups for the new Gold campaign", status: "pending", priority: "high", due_date: "2026-06-19", assigned_to: getProfileId("Arjun Mehta"), venture: "maceco" },
    { title: "Send Razorpay contract", description: "Standard B2B lead gen contract terms", status: "in_progress", priority: "urgent", due_date: "2026-06-20", assigned_to: getProfileId("Priya Sharma"), venture: "tobofu" },
    { title: "Sunburn promo staffing", description: "Confirm the list of 50 promo staff members", status: "completed", priority: "medium", due_date: "2026-06-18", assigned_to: getProfileId("Sneha Reddy"), venture: "promtal" },
  ];
  await checkError(supabase.from("tasks").insert(tasksData));

  console.log("Seeding complete!");
}

seed().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
