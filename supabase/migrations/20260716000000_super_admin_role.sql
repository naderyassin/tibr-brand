-- Super admin tier: same permissions as a regular admin, but the role is
-- protected from removal and only a super_admin can promote other users to
-- admin (enforced in server.js, not here — this migration only needs to
-- teach the DB about the new role value).
--
-- profiles.role has no CHECK constraint (confirmed against the live schema),
-- so 'super_admin' is just a new value in the existing free-text column —
-- no ALTER TABLE needed.

-- RLS policies for products/orders call is_admin(auth.uid()); it must treat
-- super_admin as admin-level too, or the account loses write access to its
-- own admin panel the moment its role changes.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Promote the account owner (nadeerysin@gmail.com / Nader Hesham).
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = '8b829f8e-d80d-4257-9351-08977b68922f';

-- ── Verify ──────────────────────────────────────────────────────────────
-- Expect: role = 'super_admin', is_admin = true.
SELECT id, full_name, role, public.is_admin(id) AS is_admin
FROM public.profiles
WHERE id = '8b829f8e-d80d-4257-9351-08977b68922f';

-- To revert: re-run the old is_admin() body (role = 'admin' only) and
-- `UPDATE public.profiles SET role = 'admin' WHERE id = '...'`.
