DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM ('pending','published','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS status public.opportunity_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- Verified official organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  website text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orgs readable" ON public.organizations;
CREATE POLICY "orgs readable" ON public.organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "apply as org" ON public.organizations;
CREATE POLICY "apply as org" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND verified = false);
DROP POLICY IF EXISTS "admins manage orgs" ON public.organizations;
CREATE POLICY "admins manage orgs" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_orgs_updated_at ON public.organizations;
CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Approved topic vocabulary
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO anon;
GRANT SELECT ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topics readable by all" ON public.topics;
CREATE POLICY "topics readable by all" ON public.topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage topics" ON public.topics;
CREATE POLICY "admins manage topics" ON public.topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.topics (slug, label, category) VALUES
  ('biology','Biology','science'),
  ('chemistry','Chemistry','science'),
  ('physics','Physics','science'),
  ('mathematics','Mathematics','science'),
  ('neuroscience','Neuroscience','science'),
  ('climate','Climate & Environment','science'),
  ('space','Space & Astronomy','science'),
  ('agriculture','Agriculture & Food','science'),
  ('robotics','Robotics','engineering'),
  ('ai','Artificial Intelligence','engineering'),
  ('software','Software Engineering','engineering'),
  ('hardware','Hardware & Electronics','engineering'),
  ('biotech','Biotech','engineering'),
  ('medicine','Medicine & Public Health','health'),
  ('psychology','Psychology','health'),
  ('economics','Economics','social'),
  ('policy','Public Policy','social'),
  ('law','Law & Human Rights','social'),
  ('education','Education','social'),
  ('journalism','Journalism','arts'),
  ('design','Design','arts'),
  ('film','Film & Media','arts'),
  ('music','Music','arts'),
  ('writing','Writing & Literature','arts'),
  ('architecture','Architecture','arts'),
  ('entrepreneurship','Entrepreneurship','business'),
  ('finance','Finance','business'),
  ('social-impact','Social Impact','business')
ON CONFLICT (slug) DO NOTHING;

-- Behaviour signals
CREATE TABLE IF NOT EXISTS public.interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  weight real NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interaction_events_user_idx ON public.interaction_events (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.interaction_events TO authenticated;
GRANT ALL ON public.interaction_events TO service_role;
ALTER TABLE public.interaction_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own events select" ON public.interaction_events;
CREATE POLICY "own events select" ON public.interaction_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own events insert" ON public.interaction_events;
CREATE POLICY "own events insert" ON public.interaction_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Hidden gem notifications
CREATE OR REPLACE FUNCTION public.notify_matching_users_on_hidden_gem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden_gem IS NOT TRUE OR NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.hidden_gem IS TRUE AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT DISTINCT m.user_id,
         'hidden_gem',
         'Hidden gem in ' || NEW.field,
         LEFT(NEW.title || ' — ' || COALESCE(NEW.summary,''), 160),
         '/opportunities/' || NEW.id
  FROM (
    SELECT s.user_id
    FROM public.saved_opportunities s
    JOIN public.opportunities o ON o.id = s.opportunity_id
    WHERE o.id <> NEW.id
      AND (lower(o.field) = lower(NEW.field) OR o.tags && NEW.tags)
    UNION
    SELECT f.follower_id AS user_id
    FROM public.follows f
    JOIN public.guides g ON g.id = f.guide_id
    WHERE lower(g.field) = lower(NEW.field)
  ) m;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hidden_gem_notify ON public.opportunities;
CREATE TRIGGER trg_hidden_gem_notify
AFTER INSERT OR UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_matching_users_on_hidden_gem();

-- Verified organizations can submit opportunities for review
DROP POLICY IF EXISTS "orgs submit opportunities" ON public.opportunities;
CREATE POLICY "orgs submit opportunities" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending' AND submitted_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.organizations org WHERE org.user_id = auth.uid() AND org.verified)
  );
DROP POLICY IF EXISTS "orgs read own submissions" ON public.opportunities;
CREATE POLICY "orgs read own submissions" ON public.opportunities FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());