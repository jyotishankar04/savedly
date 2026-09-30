"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon as Upload } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { getImportBatch, getImportItems, runImport, type ImportSourceType } from "@/lib/import";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitNotice } from "@/components/plan-limit-notice";

export default function ImportPage() {
  const importLimit = usePlanLimit("import_monthly_count");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ImportSourceType>("bookmarks_html");
  const [pastedUrls, setPastedUrls] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [itemsPage, setItemsPage] = useState(1);

  const { data: batch } = useQuery({
    queryKey: ["import", batchId],
    queryFn: () => getImportBatch(batchId as string),
    enabled: Boolean(batchId),
    refetchInterval: (query) => (query.state.data?.stillProcessing ? 4000 : false),
  });

  const { data: items } = useQuery({
    queryKey: ["import", batchId, "items", itemsPage],
    queryFn: () => getImportItems(batchId as string, { page: itemsPage, limit: 20 }),
    enabled: Boolean(batchId),
  });

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileContent(await file.text());
    setFileName(file.name);
  }

  async function submit() {
    const content = tab === "bookmarks_html" ? fileContent : pastedUrls.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const result = await runImport(tab, content);
      queryClient.invalidateQueries({ queryKey: ["plans", "me"] });
      setBatchId(result.batchId);
      setItemsPage(1);
      queryClient.invalidateQueries({ queryKey: ["import", result.batchId] });
      toast.add({
        title: "Import complete",
        description: `${result.createdCount} created, ${result.skippedCount} duplicates skipped`,
        type: "success",
      });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't run this import.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = tab === "bookmarks_html" ? Boolean(fileContent) : Boolean(pastedUrls.trim());

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Bring in bookmarks from any browser, or paste a list of links.
          {importLimit.limit !== null && !importLimit.isAtLimit && importLimit.remaining !== null && (
            <> You have {importLimit.remaining} {importLimit.remaining === 1 ? "import" : "imports"} left this month.</>
          )}
        </p>
      </div>

      <div className="flex items-center border border-border/60 rounded-lg bg-card overflow-hidden w-fit">
        <button
          onClick={() => setTab("bookmarks_html")}
          className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === "bookmarks_html" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          Upload bookmarks.html
        </button>
        <button
          onClick={() => setTab("url_list")}
          className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === "url_list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          Paste URLs
        </button>
      </div>

      {tab === "bookmarks_html" ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
            <HugeiconsIcon icon={Upload} strokeWidth={2.25} className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">{fileName ?? "Choose a bookmarks export file"}</p>
            <p className="text-[10px] text-muted-foreground">
              Chrome, Firefox, Safari, and Edge all export bookmarks in the same universal .html format.
            </p>
          </div>
          <label className="inline-block cursor-pointer">
            <span className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[11px] font-semibold hover:bg-muted">
              Choose file
            </span>
            <input type="file" accept=".html,.htm" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      ) : (
        <Textarea
          placeholder={"https://example.com/one\nhttps://example.com/two\nhttps://example.com/three"}
          value={pastedUrls}
          onChange={(e) => setPastedUrls(e.target.value)}
          rows={8}
          className="w-full rounded-xl border-input bg-background px-3 py-2.5 text-xs font-mono text-foreground"
        />
      )}

      {importLimit.isAtLimit && importLimit.limit !== null && (
        <PlanLimitNotice
          message={`Your plan includes ${importLimit.limit} ${importLimit.limit === 1 ? "import" : "imports"} a month, and you've used ${importLimit.limit === 1 ? "it" : "them"}. Upgrade for unlimited imports, or import again next month.`}
        />
      )}
      <Button onClick={submit} disabled={!canSubmit || submitting || importLimit.isAtLimit} className="h-9 rounded-full px-5 text-xs font-bold">
        {submitting ? "Importing…" : "Import"}
      </Button>

      {batch && (
        <div className="space-y-4 border-t border-border/20 pt-6">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-foreground">Last import</span>
            <Badge variant="secondary">{batch.createdCount} created</Badge>
            {batch.skippedCount > 0 && <Badge variant="outline">{batch.skippedCount} duplicates skipped</Badge>}
            {batch.stillProcessing && <span className="text-[10px] text-muted-foreground">Still processing…</span>}
          </div>

          {items && items.items.length > 0 && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">URL</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="max-w-xs truncate px-4 py-2 font-mono text-[11px] text-muted-foreground">{item.url}</td>
                        <td className="px-4 py-2">
                          <Badge variant={item.status === "created" ? "secondary" : item.status === "failed" ? "destructive" : "outline"}>
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationFooter page={items.page} limit={items.limit} total={items.total} onPageChange={setItemsPage} itemLabel="URL" />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
