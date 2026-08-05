import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyGuide, useMyProfile, useSession } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  Trash2,
  UserRound,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_app/me")({
  head: () => ({
    meta: [{ title: "Profile — Unfold" }],
  }),
  component: MePage,
});

type ProfileType = "explorer" | "guide";

function initials(name?: string | null) {
  if (!name) return "U";

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
}

function MePage() {
  const { user } = useSession();
  const { data: profile } = useMyProfile();
  const { data: guide, refetch: refetchGuide } = useMyGuide();

  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

const profileType: ProfileType =
  (profile?.profile_type as ProfileType) ?? "explorer";

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  /*
   * ---------------------------------------------------------
   * SAVED OPPORTUNITIES
   * ---------------------------------------------------------
   */

  const { data: saved } = useQuery({
    queryKey: ["my-saved", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("opportunity:opportunities(*)")
        .eq("user_id", user!.id);

      if (error) throw error;

      return data ?? [];
    },
  });

  /*
   * ---------------------------------------------------------
   * BOOKINGS
   * ---------------------------------------------------------
   */

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, session_type:guide_session_types(name, duration_minutes), guide:guides(id, headline)"
        )
        .eq("learner_id", user!.id)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  /*
   * ---------------------------------------------------------
   * PROFILE UPDATE
   * ---------------------------------------------------------
   */

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["my-profile", user?.id],
      });

      toast.success("Profile updated");
      setEditing(false);
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not update profile"
      );
    },
  });

  /*
   * ---------------------------------------------------------
   * PROFILE TYPE
   * ---------------------------------------------------------
   */

  const changeProfileType = useMutation({
    mutationFn: async (type: ProfileType) => {
      if (!user) throw new Error("Sign in required");

      const { error } = await supabase
        .from("profiles")
        .update({
          profile_type: type,
        })
        .eq("id", user.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["my-profile", user?.id],
      });

      toast.success("Profile type updated");
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not change profile type"
      );
    },
  });

  /*
   * ---------------------------------------------------------
   * COUNTS
   * ---------------------------------------------------------
   */

  const savedCount = saved?.length ?? 0;
  const bookingsCount = bookings?.length ?? 0;

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      {/* =====================================================
          PROFILE HEADER
      ===================================================== */}

      <section className="mb-7">

        <div className="flex flex-col items-center text-center">

          {/* Avatar */}

          <div className="relative">

            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? "Profile"}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-panel-2"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-3xl font-semibold text-white ring-4 ring-panel-2">
                {initials(profile?.display_name ?? user?.email)}
              </div>
            )}

            {profileType === "guide" && (
              <div className="absolute bottom-0 right-0 rounded-full bg-gold p-1.5 text-white">
                <CheckCircle2 size={14} />
              </div>
            )}

            {profileType === "organization" && (
              <div className="absolute bottom-0 right-0 rounded-full bg-sage p-1.5 text-white">
                <Building2 size={14} />
              </div>
            )}

          </div>

          {/* Name */}

          {editing ? (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-3 w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-center text-lg font-semibold outline-none focus:border-gold"
            />
          ) : (
            <h1 className="serif mt-3 text-xl font-semibold">
              {profile?.display_name ?? "Unnamed"}
            </h1>
          )}

          <p className="mt-1 text-[11px] text-ink-faint">
            {profile?.username
              ? `@${profile.username}`
              : user?.email}
          </p>

          {/* Profile type */}

          <ProfileTypeBadge type={profileType} />

          {/* Stats */}

          <div className="mt-4 flex w-full max-w-sm divide-x divide-line rounded-xl border border-line bg-panel">

            <div className="flex-1 py-3">
              <p className="text-sm font-semibold">{savedCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Saved
              </p>
            </div>

            <div className="flex-1 py-3">
              <p className="text-sm font-semibold">{bookingsCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Bookings
              </p>
            </div>

            <div className="flex-1 py-3">
              <p className="text-sm font-semibold">
                {profileType === "personal"
                  ? "Personal"
                  : profileType === "guide"
                    ? "Guide"
                    : "Organization"}
              </p>

              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Profile
              </p>
            </div>

          </div>

          {/* Bio */}

          {editing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Tell people about yourself."
              className="mt-4 w-full max-w-md rounded-lg border border-line bg-bg px-3 py-2 text-center text-sm outline-none focus:border-gold"
            />
          ) : (
            profile?.bio && (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-dim">
                {profile.bio}
              </p>
            )
          )}

          {/* Edit */}

          {editing ? (
            <div className="mt-3 flex gap-2">

              <button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending}
                className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {updateProfile.isPending ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => {
                  setEditing(false);
                  setDisplayName(profile?.display_name ?? "");
                  setBio(profile?.bio ?? "");
                }}
                className="rounded-lg border border-line px-4 py-2 text-xs"
              >
                Cancel
              </button>

            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-medium hover:bg-panel-2"
            >
              <Edit3 size={13} />
              Edit profile
            </button>
          )}

        </div>

      </section>


      {/* =====================================================
          PROFILE TYPE
      ===================================================== */}

      <ProfileTypeSection
        currentType={profileType}
        onChange={(type) => changeProfileType.mutate(type)}
        loading={changeProfileType.isPending}
      />


      {/* =====================================================
          PERSONAL USER
      ===================================================== */}

      {profileType === "personal" && (
        <PersonalProfile
          saved={saved ?? []}
          bookings={bookings ?? []}
        />
      )}


      {/* =====================================================
          GUIDE
      ===================================================== */}

      {profileType === "guide" && (
        <GuideProfile
          guide={guide}
          refetchGuide={refetchGuide}
          bookings={bookings ?? []}
        />
      )}


      {/* =====================================================
          ORGANIZATION
      ===================================================== */}

      {profileType === "organization" && (
        <OrganizationProfile />
      )}

    </div>
  );
}


function ProfileTypeBadge({
  type,
}: {
  type: ProfileType;
}) {
  const data = {
    explorer: {
      label: "Explorer",
      icon: UserRound,
    },
    guide: {
      label: "Guide",
      icon: Sparkles,
    },
  };

  const item = data[type];
  const Icon = item.icon;

  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-panel-2 px-3 py-1 text-[10px] font-medium text-ink-dim">
      <Icon size={12} />
      {item.label}
    </div>
  );
}

function ProfileTypeSection({
  currentType,
  onChange,
  loading,
}: {
  currentType: ProfileType;
  onChange: (type: ProfileType) => void;
  loading: boolean;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">
          How do you use Unfold?
        </h2>

        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
          Explore opportunities, discover experienced people, or share
          your knowledge as a Guide.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ProfileTypeButton
          active={currentType === "explorer"}
          icon={UserRound}
          title="Explorer"
          description="Discover & learn"
          onClick={() => onChange("explorer")}
          disabled={loading}
        />

        <ProfileTypeButton
          active={currentType === "guide"}
          icon={Sparkles}
          title="Guide"
          description="Share expertise"
          onClick={() => onChange("guide")}
          disabled={loading}
        />
      </div>
    </section>
  );
}

function ProfileTypeButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-3 text-center transition ${
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-line text-ink-dim hover:bg-panel-2"
      } disabled:opacity-50`}
    >
      <Icon size={18} className="mx-auto mb-2" />

      <p className="text-xs font-semibold">
        {title}
      </p>

      <p className="mt-1 text-[9px] text-ink-faint">
        {description}
      </p>
    </button>
  );
}


/* =========================================================
   PERSONAL PROFILE
========================================================= */

function PersonalProfile({
  saved,
  bookings,
}: {
  saved: any[];
  bookings: any[];
}) {
  const [tab, setTab] = useState<"saved" | "bookings">("saved");

  return (
    <div>

      <ProfileTabs
        tab={tab}
        onChange={setTab}
        tabs={[
          {
            key: "saved",
            label: "Saved",
            icon: Bookmark,
          },
          {
            key: "bookings",
            label: "Bookings",
            icon: CalendarDays,
          },
        ]}
      />

      {tab === "saved" && (
        <SavedTab saved={saved} />
      )}

      {tab === "bookings" && (
        <BookingsTab bookings={bookings} />
      )}

    </div>
  );
}


/* =========================================================
   GUIDE PROFILE
========================================================= */

function GuideProfile({
  guide,
  refetchGuide,
  bookings,
}: {
  guide: any;
  refetchGuide: () => void;
  bookings: any[];
}) {
  if (!guide) {
    return (
      <BecomeGuideCard
        onCreated={refetchGuide}
      />
    );
  }

  return (
    <div className="space-y-4">

      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">

        <div className="flex gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gold">
              Guide profile active
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-ink-dim">
              People can discover your experience and book sessions
              with you.
            </p>
          </div>

        </div>

        <div className="mt-4 flex gap-2">

          <Link
            to="/guides/$id"
            params={{ id: guide.id }}
            className="flex-1 rounded-lg border border-line px-4 py-2 text-center text-xs font-medium hover:bg-panel-2"
          >
            View public profile
          </Link>

          <Link
            to="/guide-post"
            className="flex-1 rounded-lg bg-gold px-4 py-2 text-center text-xs font-semibold text-white"
          >
            Create post
          </Link>

        </div>

      </div>

      <GuideProfileEditor
        guide={guide}
        refetch={refetchGuide}
      />

      <GuideSessionsSection
        guideId={guide.id}
      />

      <BookingsTab bookings={bookings} />

    </div>
  );
}


/* =========================================================
   BECOME GUIDE
========================================================= */

function BecomeGuideCard({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { user } = useSession();

  const [headline, setHeadline] = useState("");
  const [field, setField] = useState("");
  const [bio, setBio] = useState("");
  const [affiliations, setAffiliations] = useState("");

  const createGuide = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");

      if (!headline.trim()) {
        throw new Error("Headline is required");
      }

      if (!field.trim()) {
        throw new Error("Field is required");
      }

      if (!bio.trim()) {
        throw new Error("Bio is required");
      }

      const { error } = await supabase.rpc("become_a_guide", {
        p_headline: headline.trim(),
        p_bio: bio.trim(),
        p_field: field.trim(),
        p_affiliations: affiliations
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Guide profile created");
      onCreated();
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not create guide"
      );
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-panel p-6">

      <div className="mb-5 text-center">

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Sparkles size={22} />
        </div>

        <h2 className="serif text-xl font-semibold">
          Set up your Guide profile
        </h2>

        <p className="mt-2 text-sm text-ink-dim">
          Your personal account remains the same. This simply adds
          Guide capabilities to your profile.
        </p>

      </div>

      <div className="space-y-3">

        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Headline"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

        <input
          value={field}
          onChange={(e) => setField(e.target.value)}
          placeholder="Field — Technology, Design, Law, Sports..."
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell people what you know and how you can help."
          className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

        <input
          value={affiliations}
          onChange={(e) => setAffiliations(e.target.value)}
          placeholder="Companies, universities, communities..."
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

      </div>

      <button
        onClick={() => createGuide.mutate()}
        disabled={createGuide.isPending}
        className="mt-4 w-full rounded-lg bg-gold py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {createGuide.isPending
          ? "Creating..."
          : "Activate Guide profile"}
      </button>

    </div>
  );
}


/* =========================================================
   GUIDE EDITOR
========================================================= */

function GuideProfileEditor({
  guide,
  refetch,
}: {
  guide: any;
  refetch: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const [headline, setHeadline] = useState(guide.headline ?? "");
  const [field, setField] = useState(guide.field ?? "");
  const [bio, setBio] = useState(guide.bio ?? "");
  const [affiliations, setAffiliations] = useState(
    (guide.affiliations ?? []).join(", ")
  );

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("guides")
        .update({
          headline: headline.trim(),
          field: field.trim(),
          bio: bio.trim(),
          affiliations: affiliations
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        })
        .eq("id", guide.id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Guide profile updated");
      setEditing(false);
      refetch();
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not update"
      );
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">

      <div className="mb-4 flex items-center justify-between">

        <div>
          <h2 className="text-sm font-semibold">
            Guide information
          </h2>

          <p className="mt-1 text-[11px] text-ink-faint">
            This appears on your public Guide profile.
          </p>
        </div>

        <button
          onClick={() => setEditing((x) => !x)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs"
        >
          {editing ? "Cancel" : "Edit"}
        </button>

      </div>

      {!editing ? (
        <div>

          <h3 className="serif text-lg font-semibold">
            {guide.headline}
          </h3>

          <p className="mt-1 text-xs text-ink-faint">
            {guide.field}
          </p>

          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            {guide.bio}
          </p>

          {guide.affiliations?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {guide.affiliations.map((x: string) => (
                <span
                  key={x}
                  className="rounded-full bg-panel-2 px-2.5 py-1 text-[10px] text-ink-dim"
                >
                  {x}
                </span>
              ))}
            </div>
          )}

        </div>
      ) : (
        <div className="space-y-3">

          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Headline"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="Field"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Bio"
            className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <input
            value={affiliations}
            onChange={(e) => setAffiliations(e.target.value)}
            placeholder="Affiliations"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white"
          >
            {update.isPending ? "Saving..." : "Save"}
          </button>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   ORGANIZATION
========================================================= */

function OrganizationProfile() {
  return (
    <div className="space-y-4">

      <div className="rounded-2xl border border-line bg-panel p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage/15 text-sage">
            <Building2 size={21} />
          </div>

          <div>
            <h2 className="text-sm font-semibold">
              Organization profile
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-ink-dim">
              Use your profile to represent a company, university,
              nonprofit, community, government body, or other
              organization.
            </p>
          </div>

        </div>

        <div className="mt-5 space-y-3">

          <input
            placeholder="Organization name"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />

          <input
            placeholder="Organization type"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />

          <textarea
            rows={4}
            placeholder="About the organization"
            className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />

          <input
            placeholder="Website"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />

          <button className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-white">
            Save organization
          </button>

        </div>

      </div>


      <div className="rounded-2xl border border-line bg-panel p-5">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Plus size={17} />
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Publish opportunities
            </h3>

            <p className="mt-1 text-[11px] text-ink-faint">
              Share jobs, programs, scholarships, events and
              other opportunities.
            </p>
          </div>

        </div>

        <Link
          to="/opportunities"
          className="mt-4 block rounded-lg border border-line px-4 py-2.5 text-center text-xs font-medium hover:bg-panel-2"
        >
          View opportunities
        </Link>

      </div>

    </div>
  );
}


/* =========================================================
   PROFILE TABS
========================================================= */

function ProfileTabs({
  tabs,
  tab,
  onChange,
}: {
  tabs: Array<{
    key: string;
    label: string;
    icon: any;
  }>;
  tab: string;
  onChange: (key: any) => void;
}) {
  return (
    <div className="mb-1 flex border-t border-line">

      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex flex-1 items-center justify-center gap-1.5 border-t-2 py-3 text-[11px] font-medium uppercase tracking-wide ${
            tab === key
              ? "border-gold text-gold"
              : "border-transparent text-ink-faint"
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}

    </div>
  );
}


/* =========================================================
   SAVED
========================================================= */

function SavedTab({ saved }: { saved: any[] }) {
  if (!saved.length) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-panel p-8 text-center">

        <Bookmark
          className="mx-auto mb-3 text-ink-faint"
          size={22}
        />

        <p className="serif text-lg">
          Nothing saved yet
        </p>

        <p className="mt-2 text-sm text-ink-dim">
          Save opportunities you want to come back to.
        </p>

      </div>
    );
  }

  return (
    <div className="mt-1 space-y-2">

      {saved.map((item) => {
        const opportunity = item.opportunity;

        if (!opportunity) return null;

        return (
          <Link
            key={opportunity.id}
            to="/opportunities/$id"
            params={{ id: opportunity.id }}
            className="block rounded-xl border border-line bg-panel p-4 hover:bg-panel-2"
          >

            <p className="text-sm font-semibold">
              {opportunity.title}
            </p>

            <p className="mt-1 text-[11px] text-ink-faint">
              {opportunity.organization ?? "Opportunity"}
            </p>

          </Link>
        );
      })}

    </div>
  );
}


/* =========================================================
   BOOKINGS
========================================================= */

function BookingsTab({
  bookings,
}: {
  bookings: any[];
}) {
  if (!bookings.length) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-panel p-8 text-center">

        <CalendarDays
          className="mx-auto mb-3 text-ink-faint"
          size={22}
        />

        <p className="serif text-lg">
          No bookings yet
        </p>

        <p className="mt-2 text-sm text-ink-dim">
          Sessions you book will appear here.
        </p>

      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">

      {bookings.map((booking) => {

        const session = booking.session_type;

        const guide = booking.guide;

        return (
          <div
            key={booking.id}
            className="rounded-xl border border-line bg-panel p-4"
          >

            <div className="flex items-center justify-between">

              <p className="text-sm font-semibold">
                {session?.name ?? "Session"}
              </p>

              <span className="rounded-md bg-panel-2 px-2 py-1 text-[9px] uppercase">
                {booking.status}
              </span>

            </div>

            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint">

              <Clock size={11} />

              {formatDistanceToNow(
                new Date(booking.scheduled_at),
                { addSuffix: true }
              )}

              · {session?.duration_minutes ?? 0} min

            </p>

            {guide && (
              <Link
                to="/guides/$id"
                params={{ id: guide.id }}
                className="mt-2 inline-block text-xs text-gold"
              >
                View guide →
              </Link>
            )}

          </div>
        );
      })}

    </div>
  );
}


/* =========================================================
   GUIDE SESSIONS
========================================================= */

function GuideSessionsSection({
  guideId,
}: {
  guideId: string;
}) {
  const { data, refetch } = useQuery({
    queryKey: ["my-session-types", guideId],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_session_types")
        .select("*")
        .eq("guide_id", guideId)
        .order("created_at");

      if (error) throw error;

      return data ?? [];
    },
  });

  return (
    <SessionEditor
      guideId={guideId}
      sessions={data ?? []}
      refetch={refetch}
    />
  );
}


/* =========================================================
   SESSION EDITOR
========================================================= */

function SessionEditor({
  guideId,
  sessions,
  refetch,
}: {
  guideId: string;
  sessions: any[];
  refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);

  const add = useMutation({
    mutationFn: async () => {

      if (!name.trim()) {
        throw new Error("Session name is required");
      }

      const { error } = await supabase
        .from("guide_session_types")
        .insert({
          guide_id: guideId,
          name: name.trim(),
          description: description.trim() || null,
          duration_minutes: duration,
          price_cents: Math.round(price * 100),
        });

      if (error) throw error;
    },

    onSuccess: () => {
      setName("");
      setDescription("");
      setDuration(30);
      setPrice(0);
      setAdding(false);

      refetch();

      toast.success("Session added");
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not add session"
      );
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {

      const { error } = await supabase
        .from("guide_session_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      refetch();
      toast.success("Session removed");
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">

      <div className="mb-4 flex items-center justify-between">

        <div>
          <h3 className="text-sm font-semibold">
            Sessions
          </h3>

          <p className="mt-1 text-[11px] text-ink-faint">
            Let people book time with you.
          </p>
        </div>

        <button
          onClick={() => setAdding((x) => !x)}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus size={13} />
          Add
        </button>

      </div>

      {sessions.map((session) => (
        <div
          key={session.id}
          className="mb-2 flex items-center justify-between rounded-lg border border-line bg-bg p-3"
        >

          <div>

            <p className="text-sm font-medium">
              {session.name}
            </p>

            <p className="mt-1 text-[10px] text-ink-faint">
              {session.duration_minutes} min ·{" "}
              {session.price_cents === 0
                ? "Free"
                : `$${session.price_cents / 100}`}
            </p>

          </div>

          <button
            onClick={() => remove.mutate(session.id)}
            className="rounded-lg p-2 text-ink-faint hover:text-danger"
          >
            <Trash2 size={14} />
          </button>

        </div>
      ))}

      {adding && (
        <div className="mt-4 space-y-2 rounded-lg border border-line bg-bg p-4">

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Session name"
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you help with?"
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
          />

          <div className="grid grid-cols-2 gap-2">

            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />

            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />

          </div>

          <button
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white"
          >
            {add.isPending ? "Adding..." : "Add session"}
          </button>

        </div>
      )}

    </div>
  );
}