import Link from "next/link";

// What happens to what a person saves, stated plainly, including the part
// that is easy to leave out: AI features send content to an AI provider.
// Every line matches the privacy policy (app/(marketing)/privacy) and the
// code; the vault is described as a lock, because it isn't encryption.

const PROMISES = [
  {
    title: "Not used to train AI",
    body: "What you save and what you ask are never used to train a model, ours or anyone else's.",
  },
  {
    title: "No ads, nothing sold",
    body: "There are no ads, and your content isn't sold or handed to advertisers.",
  },
  {
    title: "AI reads it to do its job",
    body: "To summarize, tag and answer, the text of a save is sent to our AI provider and the result comes back to your account. Run your own copy and you choose the provider.",
  },
  {
    title: "Leave whenever you like",
    body: "Export everything from Settings as JSON, or as a folder of Markdown files you can open anywhere.",
  },
  {
    title: "Delete means delete",
    body: "Trash empties after 15 days. Deleting your account removes your profile and everything you saved.",
  },
  {
    title: "A vault behind a PIN",
    body: "On Lite and Pro, the vault keeps chosen items out of search, Ask and every other view until you enter your PIN. It is a lock, not encryption.",
  },
];

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-24 bg-background px-3 py-10 font-sans antialiased sm:px-5 md:py-16">
      <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-muted/60 px-5 py-16 sm:px-8 md:rounded-[2.5rem] md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground">
              What happens to what you save
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
              You&apos;re trusting this with notes, screenshots and documents. Here is exactly what we do with them.
            </p>
          </div>

          <dl className="mt-12 grid gap-x-12 border-t border-foreground/15 sm:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="border-b border-foreground/15 py-7">
                <dt className="text-lg font-medium tracking-[-0.01em] text-foreground">{promise.title}</dt>
                <dd className="mt-2 text-base leading-relaxed text-muted-foreground">{promise.body}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-sm text-muted-foreground">
            The code is public under AGPL-3.0, so all of this can be checked. Read the{" "}
            <Link href="/privacy" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
              privacy policy
            </Link>{" "}
            or the{" "}
            <Link href="/security" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
              security page
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
