ALTER TABLE reclamations RENAME COLUMN resolved_at TO closed_at;
ALTER TABLE reclamations ADD COLUMN status varchar(20) NOT NULL DEFAULT 'PENDING';
UPDATE reclamations SET status = 'RESOLVED' WHERE closed_at IS NOT NULL;
