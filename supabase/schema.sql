-- Budget Tracker schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: uses `create table if not exists` and drops/recreates policies.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. MariBank (savings) — running balance via signed entries
-- ============================================================
create table if not exists public.maribank_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. DBS (daily spending) — signed entries; Expenses carry a category,
--    Income entries (e.g. salary) leave category null
-- ============================================================
create table if not exists public.dbs_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  category text check (category in ('Food', 'Transport', 'Shopping', 'Bills', 'Other')),
  note text,
  entry_date date not null default current_date,
  -- Expenses only. Lets a one-off purchase be excluded from monthly budget
  -- totals/stats without excluding it from the account balance.
  counts_toward_budget boolean not null default true,
  created_at timestamptz not null default now()
);

-- Migration for databases created before Income/Expense typing was added
-- (category used to be required on every row). Safe to re-run.
alter table public.dbs_entries alter column category drop not null;

-- Migration for databases created before per-expense budget opt-out was
-- added. Safe to re-run.
alter table public.dbs_entries add column if not exists counts_toward_budget boolean not null default true;

-- ============================================================
-- 3. Receivables — money others owe me, tracked per person
-- ============================================================
create table if not exists public.receivables_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person text not null,
  amount numeric(12, 2) not null,
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. HSBC (investments) — contributions in, valuations logged separately
-- ============================================================
create table if not exists public.hsbc_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.hsbc_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value numeric(12, 2) not null check (value >= 0),
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. Mendaki Loan (liability) — total owed + repayment log
-- ============================================================
create table if not exists public.mendaki_loan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  total_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mendaki_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null default 50 check (amount > 0),
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists maribank_entries_user_id_idx on public.maribank_entries (user_id, entry_date desc);
create index if not exists dbs_entries_user_id_idx on public.dbs_entries (user_id, entry_date desc);
create index if not exists receivables_entries_user_id_idx on public.receivables_entries (user_id, person);
create index if not exists hsbc_contributions_user_id_idx on public.hsbc_contributions (user_id, entry_date desc);
create index if not exists hsbc_valuations_user_id_idx on public.hsbc_valuations (user_id, entry_date desc);
create index if not exists mendaki_repayments_user_id_idx on public.mendaki_repayments (user_id, entry_date desc);

-- ============================================================
-- Row Level Security — every table scoped to auth.uid()
-- ============================================================
alter table public.maribank_entries enable row level security;
alter table public.dbs_entries enable row level security;
alter table public.receivables_entries enable row level security;
alter table public.hsbc_contributions enable row level security;
alter table public.hsbc_valuations enable row level security;
alter table public.mendaki_loan enable row level security;
alter table public.mendaki_repayments enable row level security;

drop policy if exists "own rows only" on public.maribank_entries;
create policy "own rows only" on public.maribank_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.dbs_entries;
create policy "own rows only" on public.dbs_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.receivables_entries;
create policy "own rows only" on public.receivables_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.hsbc_contributions;
create policy "own rows only" on public.hsbc_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.hsbc_valuations;
create policy "own rows only" on public.hsbc_valuations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.mendaki_loan;
create policy "own rows only" on public.mendaki_loan
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.mendaki_repayments;
create policy "own rows only" on public.mendaki_repayments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Keep mendaki_loan.updated_at fresh
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists mendaki_loan_set_updated_at on public.mendaki_loan;
create trigger mendaki_loan_set_updated_at
  before update on public.mendaki_loan
  for each row execute function public.set_updated_at();
