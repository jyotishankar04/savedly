import type { DuplicateOf } from "@/lib/memories";

// A save that turns out to be a duplicate has to stop and ask the user. The
// save is running inside a mutation, far from any component, so the question
// goes through this small store: the save awaits askAboutDuplicate(), and
// <DuplicateAskHost /> (mounted once in the app) shows the dialog and answers.

export type DuplicateAnswer = "add" | "skip";

interface Pending {
  existing: DuplicateOf;
  /** What is being saved, for the dialog's wording. */
  kind: "link" | "note";
  answer: (choice: DuplicateAnswer) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function askAboutDuplicate(existing: DuplicateOf, kind: "link" | "note"): Promise<DuplicateAnswer> {
  return new Promise((resolve) => {
    // A second question while one is open would be a second save racing the first: skip the earlier one.
    pending?.answer("skip");
    pending = {
      existing,
      kind,
      answer: (choice) => {
        pending = null;
        emit();
        resolve(choice);
      },
    };
    emit();
  });
}

export const duplicatePromptStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => pending,
};
