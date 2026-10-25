"use client";

import { useParams } from "next/navigation";
import { NotePage } from "@/components/notes/note-page";

export default function EditNotePage() {
  const { id } = useParams<{ id: string }>();
  return <NotePage id={id} />;
}
