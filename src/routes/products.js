const express = require('express');
const router = express.Router();
const { supabase } = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { generateProductDescription } = require('../services/aiService');

// Helper: get the vendor row for the logged-in user
async function getVendorForUser(userId) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error('Vendor profile not found');
  return data;
}

// GET /api/products  -> public list of all products
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, description, price_kobo, ai_generated_description, vendor_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

// GET /api/products/mine -> vendor's own products (protected)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can view their products' });
    }
    const vendor = await getVendorForUser(req.user.id);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ products: data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/products/:id -> single product
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: data });
});

// POST /api/products -> create product (vendor only, AI generates description)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can create products' });
    }

    const { title, description, price_kobo, keywords, useAI } = req.body;
    if (!title || !price_kobo) {
      return res.status(400).json({ error: 'title and price_kobo are required' });
    }

    const vendor = await getVendorForUser(req.user.id);

    // Optionally use Gemini to generate a description
    let aiDescription = null;
    if (useAI !== false) {
      try {
        const ai = await generateProductDescription({ title, keywords });
        aiDescription = ai.description || null;
      } catch (e) {
        console.warn('AI description failed, continuing without it:', e.message);
      }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        vendor_id: vendor.id,
        title,
        description: description || null,
        price_kobo,
        ai_generated_description: aiDescription,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, product: data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/products/:id -> update (vendor owns it)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can update products' });
    }

    const vendor = await getVendorForUser(req.user.id);

    // Confirm the product belongs to this vendor
    const { data: existing } = await supabase
      .from('products')
      .select('vendor_id')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.vendor_id !== vendor.id) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    const { title, description, price_kobo } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price_kobo !== undefined) updates.price_kobo = price_kobo;

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, product: data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/products/:id -> delete (vendor owns it)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can delete products' });
    }

    const vendor = await getVendorForUser(req.user.id);

    const { data: existing } = await supabase
      .from('products')
      .select('vendor_id')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.vendor_id !== vendor.id) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, deleted: req.params.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
