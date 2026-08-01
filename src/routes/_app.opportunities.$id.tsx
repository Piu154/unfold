import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/opportunities/$id")({
  head: () => ({
    meta: [{ title: "Opportunity — Unfold" }],
  }),
  component: OpportunityDetailPage,
});

function OpportunityDetailPage() {
  const { id } = Route.useParams();

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ["opportunity", id],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-ink-dim">
          Loading opportunity...
        </p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-ink-dim">
          Opportunity not found.
        </p>

        <Link
          to="/feed"
          className="mt-4 inline-flex items-center gap-2 text-xs text-gold"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      {/* BACK */}

      <Link
        to="/feed"
        className="mb-6 inline-flex items-center gap-2 text-xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      {/* CATEGORY */}

      {opportunity.category && (
        <div className="mb-3">
          <span className="rounded-md bg-gold-dim px-2.5 py-1 text-[10px] font-semibold text-gold">
            {opportunity.category}
          </span>
        </div>
      )}

      {/* TITLE */}

      <h1 className="serif text-3xl font-medium">
        {opportunity.title}
      </h1>

      {/* ORGANIZATION */}

      {opportunity.organization && (
        <p className="mt-2 text-sm text-ink-dim">
          {opportunity.organization}
        </p>
      )}

      {/* LOCATION */}

      {opportunity.location && (
        <p className="mt-1 text-xs text-ink-faint">
          {opportunity.location}
        </p>
      )}

      {/* DEADLINE */}

      {opportunity.deadline && (
        <div className="mt-4 rounded-xl border border-line bg-panel p-4">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Deadline
          </p>

          <p className="mt-1 text-sm font-medium text-danger">
            {formatDistanceToNow(
              new Date(opportunity.deadline),
              { addSuffix: true }
            )}
          </p>

          <p className="mt-1 text-xs text-ink-faint">
            {new Date(opportunity.deadline).toLocaleString()}
          </p>
        </div>
      )}

      {/* DESCRIPTION */}

      {opportunity.description && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">
            About this opportunity
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">
            {opportunity.description}
          </p>
        </section>
      )}

      {/* APPLY */}

      {opportunity.application_url && (
        <div className="mt-8 border-t border-line pt-5">
          <a
            href={opportunity.application_url}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Apply
            <ExternalLink size={14} />
          </a>
        </div>
      )}

    </div>
  );
}