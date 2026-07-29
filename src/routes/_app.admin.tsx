import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyGuide, useMyRoles, useSession } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const KINDS = ["fellowship","competition","research","internship","scholarship","grant","residency","bootcamp","other"] as const;

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — Unfold" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { data: roles, isLoading } = useMyRoles();
  const nav = useNavigate();
  const isAdmin = roles?.includes("admin");

  useEffect(() => {
    if (!isLoading && !isAdmin) nav({ to: "/feed" });
  }, [isLoading, isAdmin, nav]);

  const [tab, setTab] = useState<"opps" | "posts">("opps");

  if (isLoading) return <div className="p-8 text-sm text-ink-dim">Loading…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-ink-dim">Admins only.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="serif mb-6 text-2xl font-medium">Admin</h1>
      <div className="mb-4 flex rounded-xl border border-line p-1">
        {(["opps", "posts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${tab === t ? "bg-panel-2 text-gold" : "text-ink-faint"}`}>
            {t === "opps" ? "Opportunities" : "Feed posts"}
          </button>
        ))}
      </div>
      {tab === "opps" ? <OppsAdmin /> : <PostsAdmin />}
    </div>
  );
}

function OppsAdmin() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", organization: "", kind: "fellowship" as (typeof KINDS)[number],
    field: "", summary: "", description: "", location: "", url: "", stipend: "",
    deadline: "", featured: false, hidden_gem: false, tags: "",
  });

  const { data } = useQuery({
    queryKey: ["admin-opps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        deadline: form.deadline || null,
        location: form.location || null,
        url: form.url || null,
        stipend: form.stipend || null,
        description: form.description || null,
        created_by: user!.id,
      };
      if (!payload.title || !payload.organization || !payload.field || !payload.summary)
        throw new Error("Fill title, organization, field, summary");
      const { error } = await supabase.from("opportunities").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ title: "", organization: "", kind: "fellowship", field: "", summary: "", description: "", location: "", url: "", stipend: "", deadline: "", featured: false, hidden_gem: false, tags: "" });
      qc.invalidateQueries({ queryKey: ["admin-opps"] });
      qc.invalidateQueries({ queryKey: ["search-opps"] });
      toast.success("Opportunity published");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-opps"] }),
  });

  return (
    <>
      <div className="mb-6 rounded-2xl border border-line bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold">New opportunity</h3>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <input placeholder="Organization *" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as (typeof KINDS)[number] })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input placeholder="Field *" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <input placeholder="Stipend" value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <input placeholder="Application URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <textarea placeholder="Summary * (one line)" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
            rows={2} className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
          <textarea placeholder="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-dim">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.hidden_gem} onChange={(e) => setForm({ ...form, hidden_gem: e.target.checked })} /> Hidden gem</label>
        </div>
        <button onClick={() => create.mutate()} disabled={create.isPending}
          className="mt-4 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white">Publish</button>
      </div>

      <h3 className="mb-2 text-sm font-semibold">All opportunities ({data?.length ?? 0})</h3>
      <div className="space-y-2">
        {data?.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-lg border border-line bg-panel p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{o.title}</p>
              <p className="text-[11px] text-ink-faint">{o.organization} · {o.field} · {o.kind}
                {o.deadline ? ` · closes ${formatDistanceToNow(new Date(o.deadline), { addSuffix: true })}` : ""}</p>
            </div>
            <button onClick={() => del.mutate(o.id)} className="text-xs text-danger hover:underline">Delete</button>
          </div>
        ))}
      </div>
    </>
  );
}

function PostsAdmin() {
  const { user } = useSession();
  const { data: guide } = useMyGuide();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [tags, setTags] = useState("");

  const canPost = !!guide || true; // admin can always post

  const create = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Body required");
      const { error } = await supabase.from("feed_posts").insert({
        author_id: user!.id, title: title.trim() || null, body: body.trim(),
        image_url: image.trim() || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(""); setBody(""); setImage(""); setTags("");
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      toast.success("Posted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold">Publish a feed post</h3>
      {!canPost && <p className="mb-3 text-xs text-danger">You must be an admin or a guide to post.</p>}
      <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <textarea placeholder="Share something…" value={body} onChange={(e) => setBody(e.target.value)}
        rows={4} className="mb-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <input placeholder="Image URL (optional)" value={image} onChange={(e) => setImage(e.target.value)}
        className="mb-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <button onClick={() => create.mutate()} disabled={create.isPending}
        className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white">Post</button>
    </div>
  );
}
