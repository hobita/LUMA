-- ==============================================================================
-- LUMA — Phase 4: Room Deletion & Leave Security Policies & Functions
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/etxoqifestnzboaiysks/sql/new
-- ==============================================================================

-- 1. ENABLE ROOM DELETION & LEAVE POLICIES

-- Allow owners to delete rooms
drop policy if exists "Owners can delete room" on public.rooms;
create policy "Owners can delete room"
  on public.rooms for delete
  using (auth.uid() = owner_id);

-- Allow owner or partner to update room (e.g. when leaving or renaming)
drop policy if exists "Owners can update room" on public.rooms;
drop policy if exists "Members can update room" on public.rooms;
create policy "Members can update room"
  on public.rooms for update
  using (auth.uid() = owner_id or auth.uid() = partner_id);

-- Allow deleting memberships when deleting a room or leaving
drop policy if exists "Members or room owner can delete membership" on public.room_members;
create policy "Members or room owner can delete membership"
  on public.room_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = public.room_members.room_id
      and r.owner_id = auth.uid()
    )
  );

-- Allow deleting messages when room is deleted
drop policy if exists "Members or room owner can delete messages" on public.messages;
create policy "Members or room owner can delete messages"
  on public.messages for delete
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = public.messages.room_id
      and r.owner_id = auth.uid()
    )
  );

-- 2. ATOMIC SECURITY DEFINER RPC FUNCTIONS (Bypasses RLS edge cases entirely)

create or replace function public.delete_room_by_owner(p_room_id text)
returns json as $$
declare
  v_user_id uuid;
  v_room public.rooms%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Unauthorized');
  end if;

  -- Find room by UUID or slug
  select * into v_room from public.rooms
  where (id::text = p_room_id or slug = p_room_id) and owner_id = v_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'Room not found or you are not the owner');
  end if;

  -- Delete associated messages, members, and room
  delete from public.messages where room_id = v_room.id;
  delete from public.room_members where room_id = v_room.id;
  delete from public.rooms where id = v_room.id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

create or replace function public.leave_room_as_partner(p_room_id text)
returns json as $$
declare
  v_user_id uuid;
  v_room public.rooms%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Unauthorized');
  end if;

  -- Find room by UUID or slug
  select * into v_room from public.rooms
  where (id::text = p_room_id or slug = p_room_id) and partner_id = v_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'Room not found or you are not the partner');
  end if;

  delete from public.room_members where room_id = v_room.id and user_id = v_user_id;
  update public.rooms set partner_id = null where id = v_room.id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;
