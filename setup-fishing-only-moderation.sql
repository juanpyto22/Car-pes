-- =====================================================
-- Car-pes: Fishing-only moderation + ban appeals
-- Run in Supabase SQL Editor
-- =====================================================

create extension if not exists pgcrypto;

-- Helper trigger for updated_at
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

-- =====================================================
-- 1) Fishing-only moderation events audit
-- =====================================================
create table if not exists public.fishing_moderation_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	content_type text not null check (content_type in ('post', 'story', 'live')),
	content_excerpt text,
	category text,
	is_allowed boolean not null default true,
	confidence numeric(5,4) not null default 0,
	reason text,
	detected_keywords text[] not null default '{}',
	created_at timestamptz not null default now()
);

create index if not exists idx_fishing_moderation_events_user_id
	on public.fishing_moderation_events(user_id);

create index if not exists idx_fishing_moderation_events_created_at
	on public.fishing_moderation_events(created_at desc);

alter table public.fishing_moderation_events enable row level security;

drop policy if exists "Users can insert own fishing moderation events" on public.fishing_moderation_events;
create policy "Users can insert own fishing moderation events"
	on public.fishing_moderation_events
	for insert
	to authenticated
	with check (auth.uid() = user_id);

drop policy if exists "Users can read own fishing moderation events" on public.fishing_moderation_events;
create policy "Users can read own fishing moderation events"
	on public.fishing_moderation_events
	for select
	to authenticated
	using (auth.uid() = user_id);

-- =====================================================
-- 2) Ban appeals
-- =====================================================
create table if not exists public.ban_appeals (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	ban_type text,
	ban_reason text,
	appeal_text text not null check (char_length(trim(appeal_text)) between 20 and 1500),
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	admin_response text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_ban_appeals_user_id
	on public.ban_appeals(user_id);

create index if not exists idx_ban_appeals_status
	on public.ban_appeals(status);

drop trigger if exists trg_ban_appeals_updated_at on public.ban_appeals;
create trigger trg_ban_appeals_updated_at
before update on public.ban_appeals
for each row
execute procedure public.set_updated_at_timestamp();

alter table public.ban_appeals enable row level security;

drop policy if exists "Users can create own ban appeals" on public.ban_appeals;
create policy "Users can create own ban appeals"
	on public.ban_appeals
	for insert
	to authenticated
	with check (auth.uid() = user_id);

drop policy if exists "Users can read own ban appeals" on public.ban_appeals;
create policy "Users can read own ban appeals"
	on public.ban_appeals
	for select
	to authenticated
	using (auth.uid() = user_id);

-- Optional admin policies.
-- Uses profiles.role = 'admin' with JSON access to avoid failures when
-- a specific admin column does not exist in some environments.
drop policy if exists "Admins can read all ban appeals" on public.ban_appeals;
create policy "Admins can read all ban appeals"
	on public.ban_appeals
	for select
	to authenticated
	using (
		exists (
			select 1 from public.profiles p
			where p.id = auth.uid() and coalesce(to_jsonb(p)->>'role', 'user') = 'admin'
		)
	);

drop policy if exists "Admins can update ban appeals" on public.ban_appeals;
create policy "Admins can update ban appeals"
	on public.ban_appeals
	for update
	to authenticated
	using (
		exists (
			select 1 from public.profiles p
			where p.id = auth.uid() and coalesce(to_jsonb(p)->>'role', 'user') = 'admin'
		)
	)
	with check (
		exists (
			select 1 from public.profiles p
			where p.id = auth.uid() and coalesce(to_jsonb(p)->>'role', 'user') = 'admin'
		)
	);

-- =====================================================
-- 3) RPC to submit appeal from frontend
-- =====================================================
create or replace function public.submit_ban_appeal(
	p_appeal_text text,
	p_ban_type text default null,
	p_ban_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_appeal_id uuid;
	v_has_active_ban boolean := false;
begin
	if v_user_id is null then
		raise exception 'Not authenticated';
	end if;

	if p_appeal_text is null or char_length(trim(p_appeal_text)) < 20 then
		raise exception 'Appeal text too short';
	end if;

	-- Check active ban when user_bans exists.
	if to_regclass('public.user_bans') is not null then
		select exists (
			select 1
			from public.user_bans ub
			where ub.user_id = v_user_id
				and coalesce(ub.is_active, true) = true
				and (ub.ban_expires_at is null or ub.ban_expires_at > now())
		) into v_has_active_ban;

		if not v_has_active_ban then
			raise exception 'No active ban found for this user';
		end if;
	end if;

	insert into public.ban_appeals (
		user_id,
		ban_type,
		ban_reason,
		appeal_text,
		status
	)
	values (
		v_user_id,
		p_ban_type,
		p_ban_reason,
		trim(p_appeal_text),
		'pending'
	)
	returning id into v_appeal_id;

	return v_appeal_id;
end;
$$;

grant execute on function public.submit_ban_appeal(text, text, text) to authenticated;
