/**
 * User data types for Firestore storage.
 * Auth is handled by NextAuth.js — these types are for user preferences
 * and reading history stored in Firestore.
 */

export interface UserPreferences {
  pushFilters: PushFilter[];
  notificationFrequency: "instant" | "daily" | "weekly";
  themeSubscriptions: string[];
}

export interface PushFilter {
  type: "agency" | "theme";
  value: string;
}

export interface ReadingHistoryEntry {
  uniqueId: string;
  readAt: number; // Unix timestamp
  timeSpentSeconds: number;
  source: "push" | "feed" | "search";
}
