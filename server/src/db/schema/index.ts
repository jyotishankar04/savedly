// The database schema, one file per area. Everything is re-exported here, so the rest of the code imports `db/schema` as before.
// pg-enums.ts: the pgEnum types (their values live in db/enums.ts). relations.ts: how the tables relate (defineRelations).

export * from "./pg-enums";
export * from "./identity";
export * from "./library";
export * from "./sharing";
export * from "./integrations";
export * from "./notifications";
export * from "./ai";
export * from "./platform";
export * from "./billing";
export * from "./content";
export * from "./messaging";
export * from "./imports";
export * from "./relations";
