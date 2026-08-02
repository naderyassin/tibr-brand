-- reviews.user_id referenced auth.users(id) directly. profiles.id also
-- references auth.users(id) (1:1, backfilled by the handle_new_user trigger),
-- but PostgREST can only embed a related table through a DIRECT foreign key —
-- it won't infer one transitively through a shared reference to auth.users.
-- server/routes/reviews.js selects "profiles(full_name)" alongside every
-- review, so every review query has been failing with "Could not find a
-- relationship between 'reviews' and 'profiles' in the schema cache" and
-- silently falling back to an empty list.
--
-- Repointing the FK at profiles(id) changes no valid data — every user_id
-- that could reference auth.users(id) already has a matching profiles row —
-- it only gives PostgREST the join path it needs.
ALTER TABLE public.reviews
  DROP CONSTRAINT reviews_user_id_fkey,
  ADD CONSTRAINT reviews_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
