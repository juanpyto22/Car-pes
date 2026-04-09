-- =====================================================
-- MESSAGES + GROUP ROLES SETUP (Car-Pes)
-- Ejecutar en SQL Editor de Supabase
-- =====================================================

BEGIN;

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

-- ---------- MESSAGES POLICIES ----------
DROP POLICY IF EXISTS "messages_select_participants" ON messages;
DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
DROP POLICY IF EXISTS "messages_update_receiver_read" ON messages;

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
