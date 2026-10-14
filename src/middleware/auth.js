const { getUserFromToken } = require('../services/authService');
const { supabase } = require('../services/db');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const user = await getUserFromToken(token);

    // Fetch role from users table
    const { data: userRow } = await supabase
      .from('users')
      .select('role, kyc_status')
      .eq('id', user.id)
      .single();

    req.user = { id: user.id, email: user.email, role: userRow?.role, kyc_status: userRow?.kyc_status };
    next();
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
}

module.exports = { requireAuth };
