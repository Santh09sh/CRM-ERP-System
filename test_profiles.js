const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('payouts').insert({
  ambassador_id: '6a31425d-78d0-4708-a182-4c4b529b9655',
  amount: 100,
  status: 'requested',
  payment_method_type: 'upi',
  upi_id: 'test@upi'
}).select().then(res => console.log(res));
