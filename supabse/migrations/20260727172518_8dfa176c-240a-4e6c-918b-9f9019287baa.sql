-- 1. Opportunity kind -> text (28+ types)
ALTER TABLE public.opportunities ALTER COLUMN kind TYPE text USING kind::text;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS remote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eligibility text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trending_score real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_source boolean NOT NULL DEFAULT false;

-- 2. Profile personalization fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS career_goal text,
  ADD COLUMN IF NOT EXISTS location text;

-- 3. Reposts
CREATE TABLE IF NOT EXISTS public.opportunity_reposts (
  user_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);
GRANT SELECT, INSERT, DELETE ON public.opportunity_reposts TO authenticated;
GRANT SELECT ON public.opportunity_reposts TO anon;
GRANT ALL ON public.opportunity_reposts TO service_role;
ALTER TABLE public.opportunity_reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reposts readable" ON public.opportunity_reposts FOR SELECT USING (true);
CREATE POLICY "own reposts insert" ON public.opportunity_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reposts delete" ON public.opportunity_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Shares (analytics-ish, append only)
CREATE TABLE IF NOT EXISTS public.opportunity_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'link',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.opportunity_shares TO authenticated;
GRANT ALL ON public.opportunity_shares TO service_role;
ALTER TABLE public.opportunity_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shares readable" ON public.opportunity_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "own shares insert" ON public.opportunity_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Organization follows (subscribe to an organization by name)
CREATE TABLE IF NOT EXISTS public.org_follows (
  user_id uuid NOT NULL,
  org_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, org_name)
);
GRANT SELECT, INSERT, DELETE ON public.org_follows TO authenticated;
GRANT ALL ON public.org_follows TO service_role;
ALTER TABLE public.org_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own org follows" ON public.org_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Ingestion sources
CREATE TABLE IF NOT EXISTS public.ingestion_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website text,
  careers_url text,
  hiring_type text,
  typical_roles text,
  domain text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ingestion_sources TO anon, authenticated;
GRANT ALL ON public.ingestion_sources TO service_role;
ALTER TABLE public.ingestion_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources readable" ON public.ingestion_sources FOR SELECT USING (true);
CREATE POLICY "admins manage sources" ON public.ingestion_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ingestion_sources_updated_at BEFORE UPDATE ON public.ingestion_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ingestion_sources (name, website, careers_url, hiring_type, typical_roles, domain, notes) VALUES
('NITI Aayog','https://www.niti.gov.in','https://workforbharat.niti.gov.in','Interview/Contract','Young Professional, Consultant','Government','Frequent'),
('Quality Council of India','https://www.qualitycouncil.org','https://www.qualitycouncil.org/careers','Interview','Analyst, Consultant','Government','Frequent'),
('Digital India Corporation','https://dic.gov.in','https://dic.gov.in/careers','Interview','Tech, Project Manager','Technology','Frequent'),
('NeGD','https://negd.gov.in','https://negd.gov.in/careers','Interview','Consultant','Technology','Frequent'),
('MyGov','https://www.mygov.in','https://www.mygov.in/workatmygov/','Interview','Content, Tech','Government','Frequent'),
('Invest India','https://www.investindia.gov.in','https://www.investindia.gov.in/careers','Interview/Contract',NULL,'Business',NULL),
('National Health Authority','https://nha.gov.in','https://nha.gov.in/careers','Interview/Contract',NULL,'Medical',NULL),
('NSDC','https://nsdcindia.org','https://nsdcindia.org/careers','Interview/Contract',NULL,'Education',NULL),
('NISG','https://nisg.org','https://nisg.org/careers','Interview/Contract',NULL,'Technology',NULL),
('Bureau of Indian Standards','https://www.bis.gov.in','https://www.bis.gov.in/recruitment/','Interview/Contract',NULL,'Government',NULL),
('C-DAC','https://www.cdac.in','https://www.cdac.in/index.aspx?id=careers','Interview/Contract',NULL,'Technology',NULL),
('National Informatics Centre','https://www.nic.in','https://www.nic.in/recruitments/','Interview/Contract',NULL,'Technology',NULL),
('STPI','https://stpi.in','https://stpi.in/en/careers','Interview/Contract',NULL,'Technology',NULL),
('IndiaAI','https://indiaai.gov.in','https://indiaai.gov.in/careers','Interview/Contract',NULL,'AI',NULL),
('NIXI','https://www.nixi.in','https://www.nixi.in/careers/','Interview/Contract',NULL,'Technology',NULL),
('NPCI','https://www.npci.org.in','https://www.npci.org.in/careers','Interview/Contract',NULL,'Finance',NULL),
('CERT-In','https://www.cert-in.org.in','https://www.cert-in.org.in/','Interview/Contract',NULL,'Cybersecurity',NULL),
('MeitY','https://www.meity.gov.in','https://www.meity.gov.in/vacancies','Interview/Contract',NULL,'Government',NULL),
('Atal Innovation Mission','https://aim.gov.in','https://aim.gov.in/careers.php','Interview/Contract',NULL,'Entrepreneurship',NULL),
('Startup India','https://www.startupindia.gov.in','https://www.startupindia.gov.in/','Interview/Contract',NULL,'Entrepreneurship',NULL),
('BIRAC','https://birac.nic.in','https://birac.nic.in/career.php','Interview/Contract',NULL,'Research',NULL),
('National Innovation Foundation','https://nif.org.in','https://nif.org.in/careers','Interview/Contract',NULL,'Research',NULL),
('NIUA','https://niua.in','https://niua.in/careers','Interview/Contract',NULL,'Research',NULL),
('NILERD','https://nilerd.ac.in','https://nilerd.ac.in/recruitment','Interview/Contract',NULL,'Research',NULL),
('ICRIER','https://icrier.org','https://icrier.org/careers/','Interview/Contract',NULL,'Research',NULL),
('NCAER','https://www.ncaer.org','https://www.ncaer.org/careers','Interview/Contract',NULL,'Research',NULL),
('ICMR','https://www.icmr.gov.in','https://www.icmr.gov.in/recruitments','Interview/Contract',NULL,'Medical',NULL),
('AIIMS','https://www.aiims.edu','https://www.aiims.edu/index.php/recruitment','Interview/Contract',NULL,'Medical',NULL),
('NIMHANS','https://nimhans.ac.in','https://nimhans.ac.in/recruitment/','Interview/Contract',NULL,'Medical',NULL),
('Tata Memorial Centre','https://tmc.gov.in','https://tmc.gov.in/index.php/en/careers','Interview/Contract',NULL,'Medical',NULL),
('National Institute of Epidemiology','https://nie.gov.in','https://nie.gov.in/recruitment','Interview/Contract',NULL,'Medical',NULL),
('ICAR','https://icar.org.in','https://icar.org.in/recruitment','Interview/Contract',NULL,'Agriculture',NULL),
('CIFE','https://cife.edu.in','https://cife.edu.in/recruitment','Interview/Contract',NULL,'Agriculture',NULL),
('Forest Survey of India','https://fsi.nic.in','https://fsi.nic.in/recruitment','Interview/Contract',NULL,'Environment',NULL),
('Wildlife Institute of India','https://wii.gov.in','https://wii.gov.in/recruitment','Interview/Contract',NULL,'Environment',NULL),
('IIRS','https://www.iirs.gov.in','https://www.iirs.gov.in/Recruitment','Interview/Contract',NULL,'Space',NULL),
('ISRO','https://www.isro.gov.in','https://www.isro.gov.in/Careers.html','Interview/Contract',NULL,'Space',NULL),
('DRDO','https://www.drdo.gov.in','https://www.drdo.gov.in/drdo/careers','Interview/Contract',NULL,'Defense',NULL),
('DIAT','https://www.diat.ac.in','https://www.diat.ac.in/recruitment/','Interview/Contract',NULL,'Defense',NULL),
('Aeronautical Development Agency','https://www.ada.gov.in','https://www.ada.gov.in/careers','Interview/Contract',NULL,'Aviation',NULL),
('CRIS','https://cris.org.in','https://cris.org.in/careers','Interview/Contract',NULL,'Technology',NULL),
('RailTel','https://www.railtelindia.com','https://www.railtelindia.com/careers.html','Interview/Contract',NULL,'Technology',NULL),
('DFCCIL','https://dfccil.com','https://dfccil.com/Home/CareerList','Interview/Contract',NULL,'Engineering',NULL),
('NHAI','https://nhai.gov.in','https://nhai.gov.in/recruitment','Interview/Contract',NULL,'Engineering',NULL),
('NCRTC','https://ncrtc.in','https://ncrtc.in/careers/','Interview/Contract',NULL,'Engineering',NULL),
('DMRC','https://www.delhimetrorail.com','https://www.delhimetrorail.com/careers','Interview/Contract',NULL,'Engineering',NULL),
('IWAI','https://iwai.nic.in','https://iwai.nic.in/recruitment','Interview/Contract',NULL,'Engineering',NULL),
('NISE','https://nise.res.in','https://nise.res.in/recruitment/','Interview/Contract',NULL,'Environment',NULL),
('SECI','https://www.seci.co.in','https://www.seci.co.in/careers','Interview/Contract',NULL,'Environment',NULL),
('EESL','https://www.eeslindia.org','https://www.eeslindia.org/en/careers/','Interview/Contract',NULL,'Environment',NULL),
('IREDA','https://www.ireda.in','https://www.ireda.in/careers','Interview/Contract',NULL,'Finance',NULL),
('National Board of Accreditation','https://www.nbaind.org','https://www.nbaind.org/careers','Interview/Contract',NULL,'Education',NULL),
('NDMA','https://ndma.gov.in','https://ndma.gov.in/Recruitment','Interview/Contract',NULL,'Government',NULL),
('NIDM','https://nidm.gov.in','https://nidm.gov.in/recruitment.asp','Interview/Contract',NULL,'Government',NULL),
('NHRC','https://nhrc.nic.in','https://nhrc.nic.in/vacancies','Interview/Contract',NULL,'Law',NULL),
('National Commission for Women','https://ncw.gov.in','https://ncw.gov.in/vacancies','Interview/Contract',NULL,'Social Impact',NULL),
('UIDAI','https://uidai.gov.in','https://uidai.gov.in/en/about-uidai/careers.html','Interview/Contract',NULL,'Government',NULL),
('Election Commission of India','https://www.eci.gov.in','https://www.eci.gov.in/vacancies','Interview/Contract',NULL,'Government',NULL),
('National Book Trust','https://nbtindia.gov.in','https://nbtindia.gov.in/recruitment','Interview/Contract',NULL,'Arts',NULL),
('Prasar Bharati','https://prasarbharati.gov.in','https://prasarbharati.gov.in/vacancies/','Interview/Contract',NULL,'Journalism',NULL)
ON CONFLICT (name) DO NOTHING;

-- 7. Collaborative filtering: "people who saved this also saved..."
CREATE OR REPLACE FUNCTION public.co_saved_opportunities(_user_id uuid, _limit int DEFAULT 20)
RETURNS TABLE (opportunity_id uuid, score bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT opportunity_id FROM public.saved_opportunities WHERE user_id = _user_id
  ),
  peers AS (
    SELECT DISTINCT s.user_id
    FROM public.saved_opportunities s
    JOIN mine m ON m.opportunity_id = s.opportunity_id
    WHERE s.user_id <> _user_id
  )
  SELECT s.opportunity_id, count(*)::bigint AS score
  FROM public.saved_opportunities s
  JOIN peers p ON p.user_id = s.user_id
  WHERE s.opportunity_id NOT IN (SELECT opportunity_id FROM mine)
  GROUP BY s.opportunity_id
  ORDER BY score DESC
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.co_saved_opportunities(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.co_saved_opportunities(uuid, int) TO authenticated;

-- 8. Notify org followers when a followed organization publishes
CREATE OR REPLACE FUNCTION public.notify_org_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT f.user_id, 'org_post',
         NEW.organization || ' posted a new opportunity',
         LEFT(NEW.title, 140),
         '/opportunities/' || NEW.id
  FROM public.org_follows f
  WHERE lower(f.org_name) = lower(NEW.organization);

  RETURN NEW;
END;
$$;
CREATE TRIGGER opportunities_notify_org_followers
AFTER INSERT OR UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_org_followers();
