-- Security OTP: one-time codes that gate sensitive account changes
-- (password, email, phone). A challenge is created server-side, a 6-digit code
-- is delivered out-of-band (email now; SMS later — see server/services/
-- notifications.js), and the change only applies once the code is verified.
--
-- Security shape:
--   * Only the CODE HASH is stored, never the code itself.
--   * `target_hash` binds the challenge to the exact new value (new password /
--     email / phone) requested at creation, so a verified code can't be
--     replayed to set a different value.
--   * Short-lived (expires_at) + attempt-capped (attempts/max_attempts).
--   * RLS is ENABLED with NO policies: anon and authenticated clients get zero
--     access. Only the service role (used by the security routes) touches it —
--     the client SDK can never read or forge a challenge row.
--
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS so a re-run is a no-op.

CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action       text NOT NULL CHECK (action IN ('password', 'email', 'phone')),
  channel      text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  destination  text NOT NULL,               -- where the code was sent (email/phone), for audit + masked display
  code_hash    text NOT NULL,               -- sha256(pepper : code) — never the code itself
  target_hash  text NOT NULL,               -- sha256(pepper : new_value) — binds the code to the exact change
  attempts     integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at  timestamptz,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

-- Deliberately NO policies: with RLS on and no policy, anon/authenticated get
-- nothing. The service-role key bypasses RLS, which is the only path in.
DROP POLICY IF EXISTS "no client access to otp challenges" ON public.otp_challenges;

CREATE INDEX IF NOT EXISTS otp_challenges_user_id_idx  ON public.otp_challenges (user_id);
CREATE INDEX IF NOT EXISTS otp_challenges_expires_idx  ON public.otp_challenges (expires_at);

-- ── Self-validating PASS/FAIL (FAILs sort to the top) ───────────────────────
SELECT
  t.check,
  CASE WHEN t.pass THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'otp_challenges table exists' AS check,
         to_regclass('public.otp_challenges') IS NOT NULL AS pass
  UNION ALL SELECT 'RLS enabled',
         COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.otp_challenges'::regclass), false)
  UNION ALL SELECT 'no RLS policies (service-role only)',
         NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='otp_challenges')
  UNION ALL SELECT 'action CHECK constraint present',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.otp_challenges'::regclass AND contype='c'
                 AND pg_get_constraintdef(oid) ILIKE '%action%')
  UNION ALL SELECT 'user_id index present',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='otp_challenges_user_id_idx')
) t
ORDER BY t.pass, t.check;
