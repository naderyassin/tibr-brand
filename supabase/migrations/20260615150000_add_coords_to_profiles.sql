-- Store raw GPS coordinates on the profile for precise delivery location.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude  FLOAT8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude FLOAT8;
