# Marketplace AI (Supabase)

Node.js + Express + Supabase backend for a multi-vendor marketplace with AI.

- Fraud scoring on transactions
- Gemini-powered product descriptions
- Paystack payments
- Supabase (PostgreSQL + Auth + Storage)

## Endpoints
- GET  /                      health
- GET  /api/health            health
- GET  /api/db-test           reads vendors table (verify Supabase works)
- POST /api/ai/description    { title, keywords }
- POST /api/pay/init          { email, amountKobo, orderId }
- POST /api/webhook/paystack  Paystack webhook
- POST /api/fraud/check       { amount, isNewUser }

## Setup
1. Create Supabase project
2. Paste scripts/supabase-schema.sql into Supabase SQL Editor and run
3. Copy .env.example -> .env and fill in your keys
4. npm install
5. npm start
