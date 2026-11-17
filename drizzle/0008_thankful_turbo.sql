ALTER TABLE "memberships" ADD COLUMN "role" varchar(12) DEFAULT 'member' NOT NULL;
UPDATE memberships SET role = 'admin' WHERE (user_id, group_id) IN (SELECT created_by, id FROM groups);