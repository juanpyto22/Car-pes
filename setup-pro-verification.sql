-- ==============================================
-- Setup: Pro profile verification requests
-- ==============================================

create table if not exists public.pro_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  business_type text not null default 'empresa',
  legal_name text not null,
  tax_id text not null,
  contact_phone text not null,
  website text not null,
  business_address text not null,
  docs_url text,
  validation_notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pro_verification_requests_user_id
  on public.pro_verification_requests(user_id);

create index if not exists idx_pro_verification_requests_status
  on public.pro_verification_requests(status);

create or replace function public.set_pro_verification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_pro_verification_updated_at on public.pro_verification_requests;
create trigger trg_set_pro_verification_updated_at
before update on public.pro_verification_requests
for each row
execute function public.set_pro_verification_updated_at();

alter table public.pro_verification_requests enable row level security;

-- Users can create their own requests.
drop policy if exists "pro_verification_insert_own" on public.pro_verification_requests;
create policy "pro_verification_insert_own"
on public.pro_verification_requests
for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can read their own requests.
-- Everyone can read approved requests so profile badges can be displayed publicly.
drop policy if exists "pro_verification_select_own_or_approved" on public.pro_verification_requests;
create policy "pro_verification_select_own_or_approved"
on public.pro_verification_requests
for select
to public
using (auth.uid() = user_id or status = 'approved');

-- Admins can read all requests (including pending/rejected) using profiles.role.
drop policy if exists "pro_verification_admin_select_all" on public.pro_verification_requests;
create policy "pro_verification_admin_select_all"
on public.pro_verification_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(to_jsonb(p)->>'role', 'user') = 'admin'
  )
);

-- Admins can review requests and set status/notes.
drop policy if exists "pro_verification_admin_update" on public.pro_verification_requests;
create policy "pro_verification_admin_update"
on public.pro_verification_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(to_jsonb(p)->>'role', 'user') = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(to_jsonb(p)->>'role', 'user') = 'admin'
  )
);

-- Service role / admins can update review status externally.
-- (No direct authenticated update policy on purpose)
