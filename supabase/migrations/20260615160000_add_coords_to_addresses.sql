-- Add location fields to the addresses table.
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude    FLOAT8;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude   FLOAT8;
