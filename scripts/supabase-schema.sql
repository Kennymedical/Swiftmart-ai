-- Paste this into Supabase SQL Editor and click RUN

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text check (role in ('buyer','vendor','admin')) not null,
  kyc_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  business_name text not null,
  bank_account_details jsonb,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  title text not null,
  description text,
  price_kobo integer not null,
  ai_generated_description text,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references users(id),
  total_amount_kobo integer not null,
  status text default 'pending',
  paystack_reference text unique,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  user_id uuid references users(id),
  amount_kobo integer not null,
  paystack_reference text unique not null,
  status text not null,
  fraud_score numeric(5,4),
  fraud_action text,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_user_created
  on transactions(user_id, created_at desc);
