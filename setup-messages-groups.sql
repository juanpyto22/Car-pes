-- =====================================================
-- MESSAGES + GROUP ROLES SETUP (Car-Pes)
-- Ejecutar en SQL Editor de Supabase
-- =====================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- REBUILD DIRECT MESSAGES (requested reset)
-- =====================================================
DROP TABLE IF EXISTS direct_messages CASCADE;

CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  story_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_chat_hidden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, partner_id)
);

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS direct_message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_chat_hidden_user_partner ON direct_chat_hidden(user_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_blocked ON blocked_users(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_direct_message_likes_message ON direct_message_likes(message_id);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_chat_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_likes ENABLE ROW LEVEL SECURITY;

-- Ensure role column exists for group membership permissions
ALTER TABLE IF EXISTS chat_group_members
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

UPDATE chat_group_members
SET role = 'member'
WHERE role IS NULL;

-- Force creator as admin role when possible
UPDATE chat_group_members m
SET role = 'admin'
FROM chat_groups g
WHERE m.group_id = g.id AND m.user_id = g.creator_id;

-- Basic role constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_group_members_role_check'
  ) THEN
    ALTER TABLE chat_group_members
    ADD CONSTRAINT chat_group_members_role_check CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

-- Enable RLS if needed
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS group_messages ENABLE ROW LEVEL SECURITY;

-- ---------- DIRECT MESSAGES POLICIES ----------
DROP POLICY IF EXISTS "direct_messages_select_participants" ON direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert_sender" ON direct_messages;
DROP POLICY IF EXISTS "direct_messages_update_receiver_read" ON direct_messages;
DROP POLICY IF EXISTS "direct_messages_delete_participants" ON direct_messages;
DROP POLICY IF EXISTS "direct_messages_delete_sender" ON direct_messages;

CREATE POLICY "direct_messages_select_participants"
ON direct_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "direct_messages_insert_sender"
ON direct_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "direct_messages_update_receiver_read"
ON direct_messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "direct_messages_delete_sender"
ON direct_messages FOR DELETE
USING (auth.uid() = sender_id);

-- ---------- DIRECT CHAT HIDDEN POLICIES ----------
DROP POLICY IF EXISTS "direct_chat_hidden_select_own" ON direct_chat_hidden;
DROP POLICY IF EXISTS "direct_chat_hidden_insert_own" ON direct_chat_hidden;
DROP POLICY IF EXISTS "direct_chat_hidden_update_own" ON direct_chat_hidden;
DROP POLICY IF EXISTS "direct_chat_hidden_delete_own" ON direct_chat_hidden;

CREATE POLICY "direct_chat_hidden_select_own"
ON direct_chat_hidden FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "direct_chat_hidden_insert_own"
ON direct_chat_hidden FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "direct_chat_hidden_update_own"
ON direct_chat_hidden FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "direct_chat_hidden_delete_own"
ON direct_chat_hidden FOR DELETE
USING (auth.uid() = user_id);

-- ---------- BLOCKED USERS POLICIES ----------
DROP POLICY IF EXISTS "blocked_users_select_participant" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_insert_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_delete_own" ON blocked_users;

CREATE POLICY "blocked_users_select_participant"
ON blocked_users FOR SELECT
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "blocked_users_insert_own"
ON blocked_users FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_delete_own"
ON blocked_users FOR DELETE
USING (auth.uid() = blocker_id);

-- ---------- DIRECT MESSAGE LIKES POLICIES ----------
DROP POLICY IF EXISTS "direct_message_likes_select_participant" ON direct_message_likes;
DROP POLICY IF EXISTS "direct_message_likes_insert_participant" ON direct_message_likes;
DROP POLICY IF EXISTS "direct_message_likes_delete_own" ON direct_message_likes;

CREATE POLICY "direct_message_likes_select_participant"
ON direct_message_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM direct_messages dm
    WHERE dm.id = direct_message_likes.message_id
      AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  )
);

CREATE POLICY "direct_message_likes_insert_participant"
ON direct_message_likes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM direct_messages dm
    WHERE dm.id = direct_message_likes.message_id
      AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  )
);

CREATE POLICY "direct_message_likes_delete_own"
ON direct_message_likes FOR DELETE
USING (auth.uid() = user_id);

-- ---------- MESSAGES POLICIES ----------
DROP POLICY IF EXISTS "messages_select_participants" ON messages;
DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
DROP POLICY IF EXISTS "messages_update_receiver_read" ON messages;
DROP POLICY IF EXISTS "messages_delete_participants" ON messages;
DROP POLICY IF EXISTS "messages_delete_sender" ON messages;

CREATE POLICY "messages_select_participants"
ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_sender"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_receiver_read"
ON messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "messages_delete_sender"
ON messages FOR DELETE
USING (auth.uid() = sender_id);

-- ---------- GROUP MEMBERS POLICIES ----------
DROP POLICY IF EXISTS "group_members_select_if_member" ON chat_group_members;
DROP POLICY IF EXISTS "group_members_insert_if_admin" ON chat_group_members;
DROP POLICY IF EXISTS "group_members_update_if_admin" ON chat_group_members;
DROP POLICY IF EXISTS "group_members_delete_if_admin" ON chat_group_members;

CREATE POLICY "group_members_select_if_member"
ON chat_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_group_members me
    WHERE me.group_id = chat_group_members.group_id
      AND me.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = chat_group_members.group_id
      AND g.creator_id = auth.uid()
  )
);

CREATE POLICY "group_members_insert_if_admin"
ON chat_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = chat_group_members.group_id
      AND g.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_group_members me
    WHERE me.group_id = chat_group_members.group_id
      AND me.user_id = auth.uid()
      AND me.role = 'admin'
  )
);

CREATE POLICY "group_members_update_if_admin"
ON chat_group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = chat_group_members.group_id
      AND g.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_group_members me
    WHERE me.group_id = chat_group_members.group_id
      AND me.user_id = auth.uid()
      AND me.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = chat_group_members.group_id
      AND g.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_group_members me
    WHERE me.group_id = chat_group_members.group_id
      AND me.user_id = auth.uid()
      AND me.role = 'admin'
  )
);

CREATE POLICY "group_members_delete_if_admin"
ON chat_group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = chat_group_members.group_id
      AND g.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_group_members me
    WHERE me.group_id = chat_group_members.group_id
      AND me.user_id = auth.uid()
      AND me.role = 'admin'
  )
);

-- ---------- CHAT GROUPS POLICIES ----------
DROP POLICY IF EXISTS "chat_groups_select_if_member" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_delete_creator" ON chat_groups;

CREATE POLICY "chat_groups_select_if_member"
ON chat_groups FOR SELECT
USING (
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM chat_group_members m
    WHERE m.group_id = chat_groups.id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "chat_groups_delete_creator"
ON chat_groups FOR DELETE
USING (creator_id = auth.uid());

-- ---------- GROUP MESSAGES POLICIES ----------
DROP POLICY IF EXISTS "group_messages_select_if_member" ON group_messages;
DROP POLICY IF EXISTS "group_messages_insert_if_member" ON group_messages;
DROP POLICY IF EXISTS "group_messages_delete_if_admin" ON group_messages;

CREATE POLICY "group_messages_select_if_member"
ON group_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_group_members m
    WHERE m.group_id = group_messages.group_id
      AND m.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = group_messages.group_id
      AND g.creator_id = auth.uid()
  )
);

CREATE POLICY "group_messages_insert_if_member"
ON group_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM chat_group_members m
      WHERE m.group_id = group_messages.group_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_groups g
      WHERE g.id = group_messages.group_id
        AND g.creator_id = auth.uid()
    )
  )
);

CREATE POLICY "group_messages_delete_if_admin"
ON group_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_groups g
    WHERE g.id = group_messages.group_id
      AND g.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM chat_group_members me
    WHERE me.group_id = group_messages.group_id
      AND me.user_id = auth.uid()
      AND me.role = 'admin'
  )
);

COMMIT;

-- ✅ Setup completado.
-- Nota: Si ya existen políticas con otro nombre en tu proyecto, elimina/revisa conflictos manualmente.
