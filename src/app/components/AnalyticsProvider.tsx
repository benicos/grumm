"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  installAnalyticsLifecycle,
  setAnalyticsEnabled,
  setAnalyticsUserId,
  trackAnalyticsEvent,
  trackPageView,
  trackRetentionMilestones,
} from "@/lib/analytics/web";
import { useAuth } from "../auth/AuthProvider";

export default function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoading, profile, user } = useAuth();
  const openedRef = useRef(false);

  useEffect(() => installAnalyticsLifecycle(), []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const shouldTrack =
      !pathname.startsWith("/admin") && profile?.role !== "administrateur";

    setAnalyticsEnabled(shouldTrack);
    setAnalyticsUserId(shouldTrack ? user?.id ?? null : null);
  }, [isLoading, pathname, profile?.role, user?.id]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (pathname.startsWith("/admin") || profile?.role === "administrateur") {
      return;
    }

    if (!openedRef.current) {
      openedRef.current = true;
      void trackAnalyticsEvent({
        eventName: "app_opened",
        metadata: { surface: "web" },
      });
    }

    void trackPageView(pathname);

    if (pathname === "/") {
      void trackAnalyticsEvent({ eventName: "homepage_view" });
    }

    if (pathname === "/decouvrir" || pathname.startsWith("/decouvrir/")) {
      void trackAnalyticsEvent({ eventName: "discover_opened" });
    }

    if (pathname === "/quiz") {
      void trackAnalyticsEvent({ eventName: "quiz_page_view" });
    }

    if (user?.created_at) {
      void trackRetentionMilestones(user.created_at);
    }
  }, [isLoading, pathname, profile?.role, user?.created_at]);

  return children;
}
