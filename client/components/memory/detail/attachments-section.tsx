import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileTextIcon as FileText } from "@hugeicons/core-free-icons";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import type { MemoryDetail } from "@/types/memory";
import { attachmentFilename, formatFileSize } from "./helpers";

export function AttachmentsSection({ attachments }: { attachments: MemoryDetail["attachments"] }) {
  return (
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold text-foreground">Attachments</h2>
              <AttachmentGroup>
                {attachments.map((attachment) => (
                  <Attachment key={attachment.id} orientation="vertical">
                    <AttachmentTrigger render={<a href={attachment.fileUrl} target="_blank" rel="noreferrer" />} />
                    <AttachmentMedia variant={attachment.mimeType?.startsWith("image/") ? "image" : "icon"}>
                      {attachment.mimeType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain attachment thumbnail
                        <img src={attachment.fileUrl} alt="" />
                      ) : (
                        <HugeiconsIcon icon={FileText} strokeWidth={2.25} />
                      )}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{attachmentFilename(attachment.fileUrl)}</AttachmentTitle>
                      <AttachmentDescription>
                        {[attachment.mimeType, formatFileSize(attachment.fileSize)].filter(Boolean).join(" · ")}
                      </AttachmentDescription>
                    </AttachmentContent>
                  </Attachment>
                ))}
              </AttachmentGroup>
            </section>
  );
}
