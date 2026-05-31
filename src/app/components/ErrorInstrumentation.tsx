"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";
import { logReactError, logStructuredError } from "@/lib/logger";
import {
  clearSupabaseAuthStorage,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/client";
import { AppState } from "./AppState";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class GlobalErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logReactError(error, {
      component: "GlobalErrorBoundary",
      operation: "react render failure",
      props: { componentStack: info.componentStack },
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <AppState
          eyebrow="Erreur"
          title="Grumm. n'a pas pu afficher cette vue."
          description="L'erreur a été journalisée avec son contexte technique. Tu peux relancer la page."
          primaryHref="/decouvrir"
          primaryLabel="Retour à Découvrir"
          secondaryHref="/explorer"
          secondaryLabel="Explorer"
        />
      );
    }

    return this.props.children;
  }
}

export function BrowserErrorInstrumentation() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isInvalidRefreshTokenError(event.error ?? event.message)) {
        clearSupabaseAuthStorage();
        event.preventDefault();
        return;
      }

      logStructuredError(event.error ?? event.message, {
        component: "window.onerror",
        operation: "uncaught browser error",
        route: window.location.pathname,
        source: "Browser",
        url: event.filename,
        payload: {
          column: event.colno,
          line: event.lineno,
          message: event.message,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isInvalidRefreshTokenError(event.reason)) {
        clearSupabaseAuthStorage();
        event.preventDefault();
        return;
      }

      logStructuredError(event.reason, {
        component: "window.onunhandledrejection",
        operation: "unhandled promise rejection",
        route: window.location.pathname,
        source: "Browser",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
