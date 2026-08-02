import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/institution")({
  component: InstitutionPage,
});

function InstitutionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="serif text-2xl font-semibold">
        Institution
      </h1>

      <p className="mt-2 text-sm text-ink-dim">
        Welcome to your institution space.
      </p>
    </div>
  );
}