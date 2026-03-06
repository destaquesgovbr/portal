"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ReadingHistoryEntry } from "@/types/auth";
import {
  getReadingHistory,
  recordArticleRead,
  updateReadingTime,
} from "@/lib/firestore";

export function useReadingHistory() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const uid = session?.user?.id;

  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!isAuthenticated || !uid) {
        setHistory([]);
        return;
      }
      setIsLoading(true);
      try {
        const entries = await getReadingHistory(uid);
        setHistory(entries as ReadingHistoryEntry[]);
      } catch (err) {
        console.error("Failed to load reading history:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isAuthenticated, uid]);

  const trackRead = useCallback(
    async (uniqueId: string, source: "push" | "feed" | "search") => {
      if (!isAuthenticated || !uid) return;
      try {
        await recordArticleRead(uid, uniqueId, source);
      } catch (err) {
        console.error("Failed to record article read:", err);
      }
    },
    [isAuthenticated, uid],
  );

  const trackTime = useCallback(
    async (uniqueId: string, seconds: number) => {
      if (!isAuthenticated || !uid) return;
      try {
        await updateReadingTime(uid, uniqueId, seconds);
      } catch (err) {
        console.error("Failed to update reading time:", err);
      }
    },
    [isAuthenticated, uid],
  );

  const isRead = useCallback(
    (uniqueId: string) => history.some((h) => h.uniqueId === uniqueId),
    [history],
  );

  return { history, isLoading, trackRead, trackTime, isRead };
}
