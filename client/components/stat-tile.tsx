// Extracted from the near-identical copies that used to live inline in
// app/(platfrom)/admin/page.tsx and admin/ai-usage/page.tsx — every new page
// should import this instead of redefining it locally. Lives outside
// components/admin/ because the user-facing insights page uses it too.
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
    </div>
  );
}
