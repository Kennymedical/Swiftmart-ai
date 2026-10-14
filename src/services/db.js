const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
// IMPORTANT: Use the SERVICE ROLE key to allow admin-level actions like createUser.
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!url || !key) {
  console.error('🚨 FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file.');
  // The application will likely fail, which is better than a silent permission error.
}

const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: false },
});

module.exports = { supabase };
