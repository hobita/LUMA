-- ==============================================================================
-- LUMA — Hotfix: Fix Infinite Recursion on RLS Policies & Enable Room Joining
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/etxoqifestnzboaiysks/sql/new
-- ==============================================================================

-- 1. DROP OLD RECURSIVE POLICIES
drop policy if exists "Members can view room members" on public.room_members;
drop policy if exists "Members can insert room members" on public.room_members;
drop policy if exists "View room members" on public.room_members;
drop policy if exists "Insert room members" on public.room_members;

drop policy if exists "Read own or partner profile" on public.profiles;

drop policy if exists "Members can view room" on public.rooms;
drop policy if exists "View rooms" on public.rooms;

drop policy if exists "Members can read room messages" on public.messages;
drop policy if exists "Members can insert room messages" on public.messages;
drop policy if exists "Read room messages" on public.messages;
drop policy if exists "Insert room messages" on public.messages;


-- 2. CREATE FIXED, NON-RECURSIVE POLICIES

-- Profiles: Can read own profile or partner's profile via rooms table (no recursion)
create policy "Read own or partner profile"
  on public.profiles for select
  using (
    auth.uid() = id or exists (
      select 1 from public.rooms r
      where (r.owner_id = auth.uid() and r.partner_id = public.profiles.id)
         or (r.partner_id = auth.uid() and r.owner_id = public.profiles.id)
    )
  );

-- Rooms: Owner, partner, OR prospective partner (before joining when partner_id is null) can view
create policy "View rooms"
  on public.rooms for select
  using (
    auth.uid() = owner_id
    or auth.uid() = partner_id
    or (is_active = true and partner_id is null)
  );

-- Room Members: Users can view their own membership or rooms they belong to
create policy "View room members"
  on public.room_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = public.room_members.room_id
      and (r.owner_id = auth.uid() or r.partner_id = auth.uid())
    )
  );

-- Room Members: Users can insert their own membership record
create policy "Insert room members"
  on public.room_members for insert
  with check (
    auth.uid() = user_id
  );

-- Messages: Room members can read messages
create policy "Read room messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = public.messages.room_id
      and (r.owner_id = auth.uid() or r.partner_id = auth.uid())
    )
  );

-- Messages: Room members can insert messages
create policy "Insert room messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.rooms r
      where r.id = public.messages.room_id
      and (r.owner_id = auth.uid() or r.partner_id = auth.uid())
    )
  );

-- 3. Backfill any user profiles if users signed up before the trigger was created
insert into public.profiles (id, email, display_name)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;
