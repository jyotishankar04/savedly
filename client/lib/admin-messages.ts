import { apiFetch } from "@/lib/auth";

// Admin > Messages (server: modules/messages): messages from the contact page
// and bug reports and ideas from /report.

export type ContactStatus = "new" | "read" | "replied" | "archived";
export type ReportStatus = "open" | "reviewing" | "resolved" | "declined";
export type ReportType = "bug" | "feature";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: ContactStatus;
  /** When the copy reached the team's inbox; null when email is off or failed. */
  emailedAt: string | null;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  email: string | null;
  pageUrl: string | null;
  status: ReportStatus;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

export interface Page<T, S extends string> {
  items: T[];
  total: number;
  pageSize: number;
  counts: Partial<Record<S, number>>;
}

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = { new: "New", read: "Read", replied: "Replied", archived: "Archived" };
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = { open: "Open", reviewing: "Reviewing", resolved: "Resolved", declined: "Declined" };

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const getMessageCounts = () => apiFetch<{ newContact: number; openReports: number }>("/admin/messages/counts");

export const listContactMessages = (params: { status?: ContactStatus; q?: string; page?: number }) =>
  apiFetch<Page<ContactMessage, ContactStatus>>(`/admin/messages/contact${query(params)}`);
export const setContactStatus = (id: string, status: ContactStatus) => apiFetch<ContactMessage>(`/admin/messages/contact/${id}`, { method: "PATCH", body: { status } });
export const deleteContactMessage = (id: string) => apiFetch<{ id: string }>(`/admin/messages/contact/${id}`, { method: "DELETE" });

export const listReports = (params: { status?: ReportStatus; type?: ReportType; q?: string; page?: number }) =>
  apiFetch<Page<Report, ReportStatus>>(`/admin/messages/reports${query(params)}`);
export const setReportStatus = (id: string, status: ReportStatus) => apiFetch<Report>(`/admin/messages/reports/${id}`, { method: "PATCH", body: { status } });
export const deleteReport = (id: string) => apiFetch<{ id: string }>(`/admin/messages/reports/${id}`, { method: "DELETE" });
