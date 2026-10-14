const { supabase } = require('./db');

async function signUpVendor({ email, password, businessName }) {
  // 1. Create the Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) throw new Error('Signup failed: ' + authError.message);

  const userId = authData.user.id;

  // 2. Insert into users table
  const { error: userErr } = await supabase
    .from('users')
    .insert({ id: userId, email, role: 'vendor' });

  if (userErr) throw new Error('User row failed: ' + userErr.message);

  // 3. Insert into vendors table
  const { error: vendorErr } = await supabase
    .from('vendors')
    .insert({ user_id: userId, business_name: businessName });

  if (vendorErr) throw new Error('Vendor row failed: ' + vendorErr.message);

  return { userId, email };
}

async function loginVendor({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Login failed: ' + error.message);
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  };
}

async function getUserFromToken(token) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw new Error('Invalid token');
  return data.user;
}

module.exports = { signUpVendor, loginVendor, getUserFromToken };
