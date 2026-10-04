import { permanentRedirect } from "next/navigation";

/**
 * The old public-collection URL.
 *
 * Sharing now covers memories as well as collections, so both live at one
 * route. Slugs were carried over verbatim by the migration and are unique
 * across both kinds, which makes this a lossless redirect — every /c/ link
 * already handed out keeps working. Keep this route indefinitely.
 */
export default async function LegacyPublicCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/s/${slug}`);
}
