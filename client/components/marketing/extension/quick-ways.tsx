import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { ShortcutKbd } from "@/components/arc/shortcut-recorder/shortcut-recorder";
import { LiveShortcuts } from "@/components/marketing/extension/live-shortcuts";

// "Quicker ways in" on /chrome-extension: four ways to use the extension
// without opening the popup, each with a drawing of what you'd see. Chrome's
// own menus and address bar can't be screenshotted, so they're drawn, with
// the extension's real menu items (extension/src/background/service-worker.ts)
// and the sample library the clips on this page use.

function Card({ title, children, visual }: { title: string; children: ReactNode; visual: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.07]">
      <div aria-hidden className="relative flex h-60 items-center justify-center overflow-hidden border-b border-foreground/[0.06] bg-muted/50 px-6">
        {visual}
      </div>
      <div className="p-6">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

const MENU = "absolute w-48 rounded-lg bg-popover p-1 text-[13px] text-popover-foreground shadow-lg ring-1 ring-foreground/10";
const ITEM = "flex h-7 items-center gap-2 rounded-md px-2.5 whitespace-nowrap";
const ON = "bg-primary/10 text-foreground";
const Chevron = () => <span className="ml-auto text-muted-foreground">›</span>;

function ContextMenu() {
  return (
    <div className="relative h-full w-full max-w-[34rem]">
      <div className={`${MENU} top-4 left-0 sm:top-7`}>
        <div className={`${ITEM} text-muted-foreground`}>Back</div>
        <div className={`${ITEM} text-muted-foreground`}>Reload</div>
        <div className="my-1 h-px bg-foreground/10" />
        <div className={`${ITEM} ${ON}`}>
          <LogoMark className="size-4" ticks={false} />
          Save to Savedly
          <Chevron />
        </div>
        <div className="my-1 h-px bg-foreground/10" />
        <div className={`${ITEM} text-muted-foreground`}>Inspect</div>
      </div>
      {/* Beside its parent from sm up; on a phone, just under "Save to Savedly" so its label stays visible. */}
      <div className={`${MENU} top-[7.25rem] left-8 sm:top-[5.85rem] sm:left-[34%]`}>
        <div className={ITEM}>Save this page</div>
        <div className={ITEM}>Save selected text</div>
        <div className={ITEM}>
          Capture screenshot
          <Chevron />
        </div>
        <div className={`${ITEM} ${ON}`}>
          Save to collection
          <Chevron />
        </div>
      </div>
      <div className={`${MENU} top-[10.65rem] left-[68%] hidden w-36 sm:block`}>
        <div className={ITEM}>📖 Reading</div>
        <div className={ITEM}>🍞 Recipes</div>
      </div>
    </div>
  );
}

function AddressBar() {
  return (
    <div className="w-full max-w-md">
      <div className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm shadow-sm ring-1 ring-foreground/10">
        <span className="font-medium text-foreground">Savedly</span>
        <span className="h-4 w-px bg-foreground/20" />
        <span className="text-foreground">sourdough</span>
        <span className="h-4 w-px animate-pulse bg-primary motion-reduce:animate-none" />
      </div>
      <div className="mt-2 rounded-xl bg-popover p-1 text-[13px] shadow-lg ring-1 ring-foreground/10">
        <div className={`${ITEM} h-8 ${ON}`}>
          <span className="truncate">
            Search your Savedly library for <span className="font-medium">sourdough</span>
          </span>
        </div>
        <div className={`${ITEM} h-8`}>
          <LogoMark className="size-4 shrink-0" ticks={false} />
          <span className="truncate">
            Sourdough hydration, explained <span className="text-muted-foreground">breadnotes.example</span>
          </span>
        </div>
        <div className={`${ITEM} h-8`}>
          <LogoMark className="size-4 shrink-0" ticks={false} />
          <span className="truncate">Sourdough starter feeding schedule</span>
        </div>
      </div>
    </div>
  );
}

function SavedBadge() {
  return (
    <div className="relative h-full w-full max-w-md">
      <div className="absolute inset-x-0 top-12 flex h-11 items-center gap-2 rounded-xl bg-card px-3 shadow-sm ring-1 ring-foreground/10">
        <span className="flex h-7 flex-1 items-center truncate rounded-full bg-muted px-3 text-xs text-muted-foreground">savedly.app/blog/find-it-by-what-you-remember</span>
        <span className="relative grid size-8 place-items-center rounded-full bg-primary/10">
          <LogoMark className="size-5" ticks={false} />
          <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-[5px] bg-primary text-[10px] font-medium text-primary-foreground ring-2 ring-card">✓</span>
        </span>
      </div>
      <div className="absolute top-[5.6rem] right-0 w-56 rounded-xl bg-popover p-3 text-[13px] shadow-lg ring-1 ring-foreground/10">
        <p className="font-medium text-primary">✓ Saved to Savedly</p>
        <p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-foreground">In your Inbox to read later</p>
        <p className="mt-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-foreground">Remind me tomorrow</p>
      </div>
    </div>
  );
}

export function QuickWays() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="The right-click menu" visual={<ContextMenu />}>
        Save the page, a link, an image or the text you selected, or send it straight to one of your five most recent collections.
      </Card>
      <Card title="Keyboard shortcuts" visual={<LiveShortcuts />}>
        Save, open the side panel or highlight without reaching for the mouse. Press them here and the keys light up. You can change them in Chrome&apos;s extension shortcuts.
      </Card>
      <Card title="From the address bar" visual={<AddressBar />}>
        Type <ShortcutKbd size="sm">sv</ShortcutKbd> and a space, then what you remember. Pick a match to open it, or press Enter to see every result in Savedly.
      </Card>
      <Card title="Already saved?" visual={<SavedBadge />}>
        A ✓ on the Savedly icon means the page you&apos;re on is in your library. Click it to see what Savedly made of it, or to set a reminder.
      </Card>
    </div>
  );
}
