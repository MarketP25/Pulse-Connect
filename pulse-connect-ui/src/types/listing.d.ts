export type ListingStatus = "flagged" | "published" | "archived";

export interface Listing {
  listingId: string;
  title: string;
  description: string;
  createdAt: string; // ISO timestamp
  createdBy: string; // user ID or email
  status: ListingStatus;
  language: "en" | "sw"; // for multilingual override
  overrideRequired?: boolean;
  overrideApproved?: boolean;
  overrideNotes?: string;
  voiceNoteUrl?: string;
  flaggedReason?: string;
  auditTrail?: AuditLog[];
}

export interface AuditLog {
  action: "created" | "flagged" | "override-approved" | "archived";
  timestamp: string;
  performedBy: string;
  notes?: string;
  voiceNoteUrl?: string;
}