CREATE TABLE IF NOT EXISTS jobboard_sync_settings (
    id varchar(20) PRIMARY KEY,
    scheduled_sync_enabled boolean NOT NULL DEFAULT true
);

INSERT INTO jobboard_sync_settings (id, scheduled_sync_enabled)
VALUES ('GLOBAL', true)
ON CONFLICT (id) DO NOTHING;
