-- V3: Drop old Hibernate enum check constraint on app_configuration key column to allow new configuration keys
ALTER TABLE app_configuration DROP CONSTRAINT IF EXISTS app_configuration_key_check;
