"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { UserPreferences } from "@/types/auth";
import { getUserPreferences, setUserPreferences } from "@/lib/firestore";

const DEFAULT_PREFERENCES: UserPreferences = {
  pushFilters: [],
  notificationFrequency: "daily",
  themeSubscriptions: [],
};

const LS_KEY = "dgb-user-preferences";

export function usePreferences() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const uid = session?.user?.id;

  const [preferences, setPrefs] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences: from Firestore if authenticated, localStorage otherwise
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        if (isAuthenticated && uid) {
          const remote = await getUserPreferences(uid);
          if (remote) {
            setPrefs(remote as UserPreferences);
            localStorage.setItem(LS_KEY, JSON.stringify(remote));
          } else {
            // First login: migrate localStorage prefs to Firestore
            const local = localStorage.getItem(LS_KEY);
            if (local) {
              const parsed = JSON.parse(local) as UserPreferences;
              setPrefs(parsed);
              await setUserPreferences(uid, parsed);
            }
          }
        } else {
          const local = localStorage.getItem(LS_KEY);
          if (local) {
            setPrefs(JSON.parse(local) as UserPreferences);
          }
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isAuthenticated, uid]);

  const updatePreferences = useCallback(
    async (update: Partial<UserPreferences>) => {
      const merged = { ...preferences, ...update };
      setPrefs(merged);
      localStorage.setItem(LS_KEY, JSON.stringify(merged));

      if (isAuthenticated && uid) {
        try {
          await setUserPreferences(uid, merged);
        } catch (err) {
          console.error("Failed to save preferences to Firestore:", err);
        }
      }
    },
    [preferences, isAuthenticated, uid],
  );

  return { preferences, updatePreferences, isLoading };
}
