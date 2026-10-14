const { supabase } = require('./db');

// --- Tool definitions (OpenAI/Groq format) ---
const toolDeclarations = [
  {
    name: 'get_sales_summary',
    description: 'Get total sales and order counts for a time period. Use for questions about revenue, sales, money made, orders.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'all'] }
      },
      required: ['period']
    }
  },
  {
    name: 'get_top_products',
    description: 'Get newest/top products on the marketplace.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer' } }
    }
  },
  {
    name: 'get_flagged_transactions',
    description: 'Get transactions flagged as suspicious by fraud detection.',
    parameters: {
      type: 'object',
      properties: { action: { type: 'string', enum: ['REVIEW', 'REJECT', 'ALL'] } }
    }
  },
  {
    name: 'get_vendor_stats',
    description: 'Get list of vendors on the platform.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer' } }
    }
  },
  {
    name: 'get_recent_orders',
    description: 'Get most recent orders placed on the marketplace.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer' } }
    }
  },
  {
    name: 'get_platform_health',
    description: 'Get overall platform counts: users, vendors, products, orders, transactions.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'flag_transaction',
    description: 'Flag a transaction for admin review. Only use when user explicitly asks to flag.',
    parameters: {
      type: 'object',
      properties: {
        reference: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['reference', 'reason']
    }
  },
  {
    name: 'suspend_vendor',
    description: 'Suspend a vendor account. Only use when user explicitly asks to suspend.',
    parameters: {
      type: 'object',
      properties: {
        vendor_email: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['vendor_email', 'reason']
    }
  }
];

// --- Helpers ---
function periodStart(period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (period === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString(); }
  return null;
}

// --- Tool implementations ---
async function getSalesSummary({ period = 'today' }) {
  const start = periodStart(period);
  let q = supabase.from('transactions').select('amount_kobo, status, created_at').eq('status', 'success');
  if (start) q = q.gte('created_at', start);
  const { data, error } = await q;
  if (error) return { error: error.message };
  const total = data.reduce((s, t) => s + (t.amount_kobo || 0), 0);
  return {
    period,
    order_count: data.length,
    total_kobo: total,
    total_naira: (total / 100).toFixed(2)
  };
}

async function getTopProducts({ limit = 5 }) {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, price_kobo, created_at, ai_generated_description')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { products: data };
}

async function getFlaggedTransactions({ action = 'ALL' }) {
  let q = supabase.from('transactions').select('*').not('fraud_score', 'is', null);
  if (action !== 'ALL') q = q.eq('fraud_action', action);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(20);
  if (error) return { error: error.message };
  return { count: data.length, transactions: data };
}

async function getVendorStats({ limit = 10 }) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, business_name, created_at, user_id, users(email, kyc_status)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { vendors: data };
}

async function getRecentOrders({ limit = 10 }) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { orders: data };
}

async function getPlatformHealth() {
  const [u, v, p, o, t] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
  ]);
  return {
    users: u.count || 0,
    vendors: v.count || 0,
    products: p.count || 0,
    orders: o.count || 0,
    transactions: t.count || 0,
  };
}

async function flagTransaction({ reference, reason }) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ fraud_action: 'REVIEW' })
    .eq('paystack_reference', reference)
    .select()
    .single();
  if (error) return { error: error.message };
  return { ok: true, message: 'Transaction ' + reference + ' flagged. Reason: ' + reason, transaction: data };
}

async function suspendVendor({ vendor_email, reason }) {
  const { data: userRow } = await supabase.from('users').select('id').eq('email', vendor_email).single();
  if (!userRow) return { error: 'Vendor not found' };
  const { error } = await supabase.from('users').update({ kyc_status: 'suspended' }).eq('id', userRow.id);
  if (error) return { error: error.message };
  return { ok: true, message: 'Vendor ' + vendor_email + ' suspended. Reason: ' + reason };
}

// --- Dispatcher ---
async function executeTool(name, args) {
  const map = {
    get_sales_summary: getSalesSummary,
    get_top_products: getTopProducts,
    get_flagged_transactions: getFlaggedTransactions,
    get_vendor_stats: getVendorStats,
    get_recent_orders: getRecentOrders,
    get_platform_health: getPlatformHealth,
    flag_transaction: flagTransaction,
    suspend_vendor: suspendVendor,
  };
  const fn = map[name];
  if (!fn) return { error: 'Unknown tool: ' + name };
  try { return await fn(args || {}); }
  catch (e) { return { error: e.message }; }
}

module.exports = { toolDeclarations, executeTool };
