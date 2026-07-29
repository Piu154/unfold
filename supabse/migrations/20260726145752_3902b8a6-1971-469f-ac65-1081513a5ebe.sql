REVOKE ALL ON FUNCTION public.notify_matching_users_on_hidden_gem() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_followers_on_post() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;