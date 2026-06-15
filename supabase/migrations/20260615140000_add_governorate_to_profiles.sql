-- Add governorate field to profiles so users can save their location
-- and have it auto-filled on checkout.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS governorate TEXT;
