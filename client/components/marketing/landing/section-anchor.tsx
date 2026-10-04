// Shared by both the homepage and /features — the FeatureOverviewBento's
// tile hrefs (#ask, #search, …) are the same on either page, so the
// anchors it jumps to need to be. scroll-mt-24 accounts for the fixed
// navbar (components/marketing/navbar.tsx: `fixed inset-x-0 top-0`) —
// without it, a jump lands with the section's own heading hidden behind it.
export function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24">
      {children}
    </div>
  );
}

export default SectionAnchor;
