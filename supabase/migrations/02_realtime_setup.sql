-- ==============================================================================
-- LUMA — Phase 3: Supabase Realtime Configuration
-- ==============================================================================

-- 1. Enable Supabase Realtime on the messages table so clients receive database events
alter publication supabase_realtime add table public.messages;

-- 2. Optional: Enable replica identity to ensure old/new rows are transmitted on updates/deletes
alter table public.messages replica identity full;
