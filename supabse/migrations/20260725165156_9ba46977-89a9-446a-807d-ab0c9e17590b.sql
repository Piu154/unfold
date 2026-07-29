CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name text;
  guide_row record;
BEGIN
  SELECT display_name INTO author_name FROM public.profiles WHERE id = NEW.author_id;
  SELECT id INTO guide_row FROM public.guides WHERE user_id = NEW.author_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT
    f.follower_id,
    'new_post',
    COALESCE(author_name, 'A guide') || ' posted' || CASE WHEN NEW.media_type = 'video' OR NEW.video_url IS NOT NULL THEN ' a new reel' ELSE '' END,
    LEFT(COALESCE(NEW.title, NEW.body, ''), 140),
    CASE WHEN NEW.media_type = 'video' OR NEW.video_url IS NOT NULL THEN '/reels' ELSE '/feed' END
  FROM public.follows f
  WHERE guide_row.id IS NOT NULL AND f.guide_id = guide_row.id AND f.follower_id <> NEW.author_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_post ON public.feed_posts;
CREATE TRIGGER trg_notify_followers_on_post
AFTER INSERT ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();
