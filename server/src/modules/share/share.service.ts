// Everything the share module does for its owners and recipients, as one namespace (the controller imports it as such). The code lives in share.links.ts (the link and who may use it), share.grants.ts (people invited by email) and share.requests.ts (requests to get in).

export * from "./share.links";
export * from "./share.grants";
export * from "./share.requests";
