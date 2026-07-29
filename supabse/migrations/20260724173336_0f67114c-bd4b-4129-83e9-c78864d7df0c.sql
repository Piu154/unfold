
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'guide', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO anon, authenticated;

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)
  ) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Opportunities (admin-managed catalog)
CREATE TYPE public.opportunity_kind AS ENUM ('fellowship','competition','research','internship','scholarship','grant','residency','bootcamp','other');
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  kind opportunity_kind NOT NULL DEFAULT 'other',
  field TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  location TEXT,
  url TEXT,
  stipend TEXT,
  deadline DATE,
  featured BOOLEAN NOT NULL DEFAULT false,
  hidden_gem BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opps readable by all" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "admins manage opps insert" ON public.opportunities FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage opps update" ON public.opportunities FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage opps delete" ON public.opportunities FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER opps_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Saved opportunities
CREATE TABLE public.saved_opportunities (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved own select" ON public.saved_opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved own insert" ON public.saved_opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved own delete" ON public.saved_opportunities FOR DELETE USING (auth.uid() = user_id);

-- Guides (user opts in to become a guide with their own profile)
CREATE TABLE public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  field TEXT NOT NULL,
  affiliations TEXT[] DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT false,
  accepting_bookings BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT ALL ON public.guides TO service_role;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides readable by all" ON public.guides FOR SELECT USING (true);
CREATE POLICY "user creates own guide" ON public.guides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own guide" ON public.guides FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user deletes own guide" ON public.guides FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER guides_updated_at BEFORE UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guide session types
CREATE TABLE public.guide_session_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guide_session_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guide_session_types TO authenticated;
GRANT ALL ON public.guide_session_types TO service_role;
ALTER TABLE public.guide_session_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st readable by all" ON public.guide_session_types FOR SELECT USING (true);
CREATE POLICY "st owner manage insert" ON public.guide_session_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.user_id = auth.uid())
);
CREATE POLICY "st owner manage update" ON public.guide_session_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.user_id = auth.uid())
);
CREATE POLICY "st owner manage delete" ON public.guide_session_types FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.user_id = auth.uid())
);

-- Bookings
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled','completed');
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  session_type_id UUID NOT NULL REFERENCES public.guide_session_types(id) ON DELETE RESTRICT,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking participants read" ON public.bookings FOR SELECT USING (
  auth.uid() = learner_id OR EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.user_id = auth.uid())
);
CREATE POLICY "learner creates booking" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = learner_id);
CREATE POLICY "participants update booking" ON public.bookings FOR UPDATE USING (
  auth.uid() = learner_id OR EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.user_id = auth.uid())
);
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Feed posts (guide-authored or admin-authored insight posts)
CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feed_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable by all" ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY "author creates post" ON public.feed_posts FOR INSERT WITH CHECK (
  auth.uid() = author_id AND (
    public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid())
  )
);
CREATE POLICY "author updates post" ON public.feed_posts FOR UPDATE USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "author deletes post" ON public.feed_posts FOR DELETE USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

-- Follows (user follows a guide)
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, guide_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows read own" ON public.follows FOR SELECT USING (auth.uid() = follower_id);
CREATE POLICY "follows insert own" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows delete own" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
