export interface Competitor {
  slug: string;
  name: string;
  type: string;
  coreIdea: string;
  whatTheySave: string;
  hasSemanticSearch: string;
  hasAutoOrg: string;
  hasChatCapture: string;
  hasVault: string;
  hasSharing: string;
  hasGraphView: string;
  isOpenSource: string;
  isSelfHostable: string;
  pricingModel: string;
  pickUsIf: string[];
  pickThemIf: string[];
  whereWeExcel: string;
  whereTheyExcel: string;
}

export const ourFeatures = {
  coreIdea: "AI second brain",
  whatTheySave: "Links, images, notes, videos, PDFs, screenshots",
  hasSemanticSearch: "Yes (Hybrid + Ask Assistant)",
  hasAutoOrg: "Yes (Auto-tagging & embeddings)",
  hasChatCapture: "Adding Soon",
  hasVault: "Yes (Secure Vault)",
  hasSharing: "Yes (Public links)",
  hasGraphView: "Yes (Visual knowledge graph)",
  isOpenSource: "Yes (AGPL-3.0)",
  isSelfHostable: "Yes (Docker)",
  pricingModel: "Free (Self-Host) or Cloud",
};

export const competitors: Competitor[] = [
  {
    slug: "mymind",
    name: "mymind",
    type: "Visual memory tool",
    coreIdea: "AI-powered personal memory",
    whatTheySave: "Links, images, articles, notes, screenshots",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Yes",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "No (Private only)",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "$119/year",
    pickUsIf: [
      "You want an open-source tool you can self-host",
      "You want to share collections via public links",
      "You want to chat directly with your saves using an 'Ask' assistant"
    ],
    pickThemIf: [
      "You want a purely visual, color-driven mood board aesthetic",
      "You want an experience strictly isolated from public sharing"
    ],
    whereWeExcel: "SaveForLatter provides full data ownership, public sharing, and an interactive knowledge graph.",
    whereTheyExcel: "mymind provides a highly polished, visual-first grid ideal for designers."
  },
  {
    slug: "memorie",
    name: "Memorie",
    type: "AI second brain",
    coreIdea: "AI second brain",
    whatTheySave: "Links, reels, screenshots, voice, PDFs, text",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Yes",
    hasChatCapture: "Yes (WhatsApp/Instagram)",
    hasVault: "No",
    hasSharing: "Limited",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Paid subscriptions",
    pickUsIf: [
      "You want deep web and desktop integrations rather than relying entirely on social media bots",
      "You want to own your data structure on a self-hosted platform"
    ],
    pickThemIf: [
      "You heavily rely on capturing Reels via Instagram DMs",
      "You want to send notes exclusively via WhatsApp right now"
    ],
    whereWeExcel: "We offer a unified web dashboard, full data ownership, and robust semantic vector search.",
    whereTheyExcel: "Memorie excels in frictionless social media capture via Instagram and WhatsApp."
  },
  {
    slug: "fabric",
    name: "Fabric",
    type: "AI workspace",
    coreIdea: "AI workspace / knowledge base",
    whatTheySave: "Links, screenshots, docs, notes",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Yes",
    hasChatCapture: "Limited",
    hasVault: "No",
    hasSharing: "Yes (Multiplayer)",
    hasGraphView: "No (Spatial whiteboard)",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Freemium",
    pickUsIf: [
      "You want a folderless environment strictly focused on rapid capture and retrieval",
      "You prefer the AGPL open-source philosophy"
    ],
    pickThemIf: [
      "You want a visual canvas or spatial whiteboard to arrange notes",
      "You need complex AI agents to draft documents for you"
    ],
    whereWeExcel: "Simplicity. SaveForLatter captures data instantly and indexes it. No endless canvases to manually arrange.",
    whereTheyExcel: "Fabric acts as a spatial knowledge base where you can visually arrange objects."
  },
  {
    slug: "raindrop",
    name: "Raindrop.io",
    type: "Bookmark manager",
    coreIdea: "Advanced bookmark manager",
    whatTheySave: "Links, PDFs, videos, files",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Mostly manual + AI",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "Yes (Public folders)",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Freemium ($28/year)",
    pickUsIf: [
      "You hate manually creating folders and tagging links",
      "You want AI to read and summarize your content automatically"
    ],
    pickThemIf: [
      "You love meticulously organizing deep folder hierarchies",
      "You only need a traditional bookmark manager"
    ],
    whereWeExcel: "SaveForLatter operates entirely folderless. Everything is automatically read, tagged, and embedded for hybrid search without manual effort.",
    whereTheyExcel: "Raindrop offers deep, nested folder structures and extensive manual organization tools."
  },
  {
    slug: "readwise-reader",
    name: "Readwise Reader",
    type: "Read-it-later app",
    coreIdea: "Read-it-later / research",
    whatTheySave: "Articles, PDFs, newsletters, videos, tweets",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Tags / filters",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "No",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "$95.88/year",
    pickUsIf: [
      "You want a general-purpose memory graph for all file types",
      "You want to ask questions across your entire knowledge base"
    ],
    pickThemIf: [
      "Your primary goal is highlighting articles and reviewing them via spaced repetition",
      "You heavily consume newsletters and EPUBs"
    ],
    whereWeExcel: "SaveForLatter is a generalized second brain. It captures anything and connects it via embeddings.",
    whereTheyExcel: "Readwise Reader is arguably the best dedicated reading and highlighting environment."
  },
  {
    slug: "notion",
    name: "Notion",
    type: "Workspace tool",
    coreIdea: "Workspace / databases",
    whatTheySave: "Pages, links, files, images, notes",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Mostly user-driven",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "Yes",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Freemium",
    pickUsIf: [
      "You want to save things instantly without filling out properties",
      "You want a tool dedicated entirely to memory and retrieval"
    ],
    pickThemIf: [
      "You want to build custom relational databases",
      "You are collaborating with a team on project management"
    ],
    whereWeExcel: "Frictionless capture. You don't have to build a database or map properties to save a link.",
    whereTheyExcel: "Infinite flexibility for building custom wikis and team workflows."
  },
  {
    slug: "evernote",
    name: "Evernote",
    type: "Digital notebook",
    coreIdea: "Digital notebook",
    whatTheySave: "Notes, web pages, PDFs, images, audio",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Mostly manual",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "Yes",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Freemium ($129.99/year)",
    pickUsIf: [
      "You want a fast, lightweight, and modern AI-first tool",
      "You are tired of bloated interfaces and constant upsells"
    ],
    pickThemIf: [
      "You have decades of legacy notes in the Evernote ecosystem",
      "You rely on traditional notebook stacks"
    ],
    whereWeExcel: "We prioritize AI retrieval and automatic organization, eliminating the need to maintain notebooks.",
    whereTheyExcel: "Evernote has a massive legacy ecosystem and deep traditional note-taking formatting."
  },
  {
    slug: "google-keep",
    name: "Google Keep",
    type: "Note-taking app",
    coreIdea: "Fast notes",
    whatTheySave: "Text, photos, audio, lists",
    hasSemanticSearch: "Search, increasingly AI-assisted",
    hasAutoOrg: "Limited",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "Yes",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Free (Data mined)",
    pickUsIf: [
      "You need to save full web pages, documents, and videos",
      "You want deep semantic search that understands context"
    ],
    pickThemIf: [
      "You only need to quickly jot down a grocery list or a very short text snippet",
      "You live entirely within the Google Workspace ecosystem"
    ],
    whereWeExcel: "SaveForLatter acts as a full-fledged memory graph for rich content, not just sticky notes.",
    whereTheyExcel: "Google Keep is incredibly fast for opening and typing a 3-word reminder."
  },
  {
    slug: "capacities",
    name: "Capacities",
    type: "Knowledge management app",
    coreIdea: "Object-based second brain",
    whatTheySave: "Notes, links, images, audio, files",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Structured objects",
    hasChatCapture: "WhatsApp/Telegram for audio",
    hasVault: "No",
    hasSharing: "Yes",
    hasGraphView: "Yes",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Freemium",
    pickUsIf: [
      "You don't want to map out 'Types' and 'Properties' for everything you save",
      "You want AI to categorize things automatically without strict schemas"
    ],
    pickThemIf: [
      "You love creating strict types (e.g., 'Book', 'Meeting') and mapping data",
      "You enjoy the concept of an Object-Oriented Second Brain"
    ],
    whereWeExcel: "Frictionless capture. SaveForLatter doesn't force you to declare what an object is. It just saves it and understands it.",
    whereTheyExcel: "Capacities forces structure, which is brilliant if you want everything to fit a specific schema."
  },
  {
    slug: "glasp",
    name: "Glasp",
    type: "Social highlighter",
    coreIdea: "Personal knowledge from highlights",
    whatTheySave: "Web, PDFs, YouTube, Kindle",
    hasSemanticSearch: "Yes",
    hasAutoOrg: "Tags",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "Yes (Social)",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Free",
    pickUsIf: [
      "You want a private, secure vault for your memories rather than a social network",
      "You need to save files and notes, not just web highlights"
    ],
    pickThemIf: [
      "You want to see what other people are highlighting on the same article",
      "You want a social feed of knowledge"
    ],
    whereWeExcel: "SaveForLatter is a private, encrypted-at-rest second brain where you own your data.",
    whereTheyExcel: "Glasp is essentially a social network for readers and highlight-sharers."
  },
  {
    slug: "tome",
    name: "ToMe",
    type: "Capture app",
    coreIdea: "Save anything for later",
    whatTheySave: "Links, images, notes, voice, locations, PDFs",
    hasSemanticSearch: "Some",
    hasAutoOrg: "User-organized",
    hasChatCapture: "No",
    hasVault: "No",
    hasSharing: "No",
    hasGraphView: "No",
    isOpenSource: "No (Proprietary)",
    isSelfHostable: "No",
    pricingModel: "Freemium",
    pickUsIf: [
      "You want a web-first, cross-platform tool that works on Windows and Linux",
      "You want deep AI summarization and semantic search"
    ],
    pickThemIf: [
      "You are exclusively deep in the iOS/Mac ecosystem",
      "You prefer to organize things manually into 'Spaces'"
    ],
    whereWeExcel: "SaveForLatter is OS-agnostic, open-source, and heavily relies on AI to do the organizing for you.",
    whereTheyExcel: "ToMe is a beautifully designed, native Apple app that integrates flawlessly with the iOS share sheet."
  }
];
