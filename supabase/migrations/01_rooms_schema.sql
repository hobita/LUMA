-- ==============================================================================
-- LUMA — Phase 2 Database Schema & Security Policies (Row Level Security)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text default 'Love',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to auto-create profile on auth.users sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. ROOMS TABLE (Strictly 2 members: owner & partner)
create table if not exists public.rooms (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,               -- Short human-friendly code (e.g. "sanctuary-7F92")
  name text default 'Our Sanctuary' not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  partner_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true not null
);

create index if not exists idx_rooms_slug on public.rooms(slug);


-- 3. ROOM MEMBERS (Junction table)
create table if not exists public.room_members (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'partner')) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (room_id, user_id)
);

create index if not exists idx_room_members_user on public.room_members(user_id);
create index if not exists idx_room_members_room on public.room_members(room_id);


-- 4. ATOMIC FUNCTION: JOIN ROOM AS PARTNER (Guarantees max 2 members)
create or replace function public.join_room_as_partner(p_slug text, p_user_id uuid)
returns json as $$
declare
  v_room public.rooms%rowtype;
  v_member_count int;
  v_is_already_member boolean;
begin
  -- 1. Find the room
  select * into v_room from public.rooms where slug = p_slug and is_active = true for update;
  if not found then
    return json_build_object('success', false, 'error', 'Room not found or inactive');
  end if;

  -- 2. Check if user is already a member
  select exists(
    select 1 from public.room_members where room_id = v_room.id and user_id = p_user_id
  ) into v_is_already_member;

  if v_is_already_member then
    return json_build_object('success', true, 'room_id', v_room.id, 'slug', v_room.slug, 'role', 'existing');
  end if;

  -- 3. Check current member count
  select count(*) into v_member_count from public.room_members where room_id = v_room.id;

  if v_member_count >= 2 then
    return json_build_object('success', false, 'error', 'Room already has two members');
  end if;

  -- 4. Assign user as partner
  update public.rooms set partner_id = p_user_id where id = v_room.id;
  
  insert into public.room_members (room_id, user_id, role)
  values (v_room.id, p_user_id, 'partner');

  return json_build_object('success', true, 'room_id', v_room.id, 'slug', v_room.slug, 'role', 'partner');
end;
$$ language plpgsql security definer;


-- 5. MESSAGES TABLE (Chat history)
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_messages_room on public.messages(room_id, created_at asc);


-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;

-- Profiles: Can read own profile and partner profile (checked via rooms to prevent recursion)
create policy "Read own or partner profile"
  on public.profiles for select
  using (
    auth.uid() = id or exists (
      select 1 from public.rooms r
      where (r.owner_id = auth.uid() and r.partner_id = public.profiles.id)
         or (r.partner_id = auth.uid() and r.owner_id = public.profiles.id)
    )
  );

create policy "Update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Rooms: Members or prospective partners can view active rooms
create policy "View rooms"
  on public.rooms for select
  using (
    auth.uid() = owner_id
    or auth.uid() = partner_id
    or (is_active = true and partner_id is null)
  );

create policy "Authenticated users can create rooms"
  on public.rooms for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update room"
  on public.rooms for update
  using (auth.uid() = owner_id);

-- Room Members: Non-recursive policies
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

create policy "Insert room members"
  on public.room_members for insert
  with check (
    auth.uid() = user_id
  );

-- Messages: Only room members can read and write messages
create policy "Read room messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = public.messages.room_id
      and (r.owner_id = auth.uid() or r.partner_id = auth.uid())
    )
  );

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
