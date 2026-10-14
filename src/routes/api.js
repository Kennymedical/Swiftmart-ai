const express = require('express');
const router = express.Router();
const { supabase } = require('../services/db');
const { scoreTransaction } = require('../services/fraudService');
const { generateProductDescription } = require('../services/aiService');
const { initializeTransaction } = require('../services/paystackService');

// Health
router.get('/health', (req, res) => res.json({ ok: true, db: 'supabase' }));

// DB test - reads from vendors table
router.get('/db-test', async (req, res) => {
  const { data, error } = await supabase.from('vendors').select('*').limit(5);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rows: data });
});

// AI: Product description
router.post('/ai/description', async (req, res) => {
  try {
    const { title, keywords } = req.body;
    const result = await generateProductDescription({ title, keywords });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Payments: Initialize
router.post('/pay/init', async (req, res) => {
  try {
    const { email, amountKobo, orderId } = req.body;
    const reference = 'order_' + orderId + '_' + Date.now();
    const result = await initializeTransaction({ email, amountKobo, reference });

    await supabase.from('transactions').insert({
      order_id: orderId,
      amount_kobo: amountKobo,
      paystack_reference: reference,
      status: 'pending',
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhook: Paystack -> fraud check
router.post('/webhook/paystack', async (req, res) => {
  try {
    const event = req.body;
    if (event?.event === 'charge.success') {
      const ref = event.data.reference;
      const amount = event.data.amount / 100;

      const check = scoreTransaction({ id: ref, amount, isNewUser: false }, []);

      await supabase
        .from('transactions')
        .update({ status: 'success', fraud_score: check.score, fraud_action: check.action })
        .eq('paystack_reference', ref);

      console.log('Fraud check for', ref, check);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(200);
  }
});

// Manual fraud check
router.post('/fraud/check', (req, res) => {
  const result = scoreTransaction(req.body, []);
  res.json(result);
});

module.exports = router;
