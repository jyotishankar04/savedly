import { PuzzleIcon as Puzzle, Upload01Icon as Upload, KeyboardIcon as Keyboard } from "@hugeicons/core-free-icons";

// Step 2: what they'll use Savedly for. There used to be a second question
// ("What do you save most?") with twelve chips; it asked nearly the same
// thing, so its answer is now read off this one (`types`, saved as the
// onboarding contentTypes).
export const interests = [
  { id: "inspiration", label: "Inspiration", desc: "Websites, designs & ideas", icon: "🎨", types: ["Websites", "Screenshots"] },
  { id: "learning", label: "Learning", desc: "Tutorials, courses & resources", icon: "💻", types: ["Courses", "Videos", "Books"] },
  { id: "ideas", label: "Ideas", desc: "Things you want to build", icon: "💡", types: ["Notes", "Ideas"] },
  { id: "research", label: "Research", desc: "Articles, papers & references", icon: "🔬", types: ["Articles", "GitHub repos", "Tools"] },
  { id: "content", label: "Content", desc: "Videos, reels & posts", icon: "🎬", types: ["Videos", "Social posts"] },
];

// Step 5 Ways to save — informational only; each is a real capture path.
// Step 5. Each row opens a short looping clip of it in use (the same clips
// as the What's new tour, in public/whats-new/loops/).
export const captureChannels = [
  {
    label: "Browser extension",
    desc: "Save the current page with Ctrl/Cmd + Shift + S",
    icon: Puzzle,
    clip: "/whats-new/loops/extension.webp",
    about: "Save the page you're on, a link, some text, an image or a screenshot, without leaving it. Click the Savedly button in Chrome's toolbar, right-click anything, or press Ctrl/Cmd + Shift + S.",
  },
  {
    label: "Quick Capture",
    desc: "Press Ctrl/Cmd + Q anywhere in the dashboard",
    icon: Keyboard,
    clip: "/whats-new/loops/capture.webp",
    about: "Paste a link, write a note or drop in a file, and carry on. Open it from the Quick Capture button, the home page, or Ctrl/Cmd + Q anywhere in Savedly.",
  },
  {
    label: "Import bookmarks",
    desc: "Bring in an exported bookmarks file from Import",
    icon: Upload,
    clip: "/whats-new/loops/import.webp",
    about: "Bring your old bookmarks over in one go. Export them from Chrome, Firefox, Safari or Edge and upload the file, or paste a list of links. Find it under Import.",
  },
];

// Step 7: ideas for a first save, for anyone staring at an empty box. Each
// one only changes the hint and focuses the box; nothing is typed for them.
export const firstSavePrompts = [
  { label: "A link you meant to read", hint: "Paste the link here" },
  { label: "An idea you had", hint: "Write the idea down, in a line or two" },
  { label: "Something you'll need later", hint: "A quote, a name, a book, a number…" },
];
