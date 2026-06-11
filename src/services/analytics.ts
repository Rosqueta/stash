import posthog from "posthog-js";

export function initAnalytics(internalUser = false) {
  if (import.meta.env.DEV) return;
  if (internalUser) return;
  posthog.init("phc_y4NFg69XxHKAtfqqpDpbWhriZictiroDtsGSMB4a2TqS", {
    api_host: "https://eu.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    persistence: "localStorage",
  });
}

export function capture(event: string, properties?: Record<string, unknown>) {
  try {
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}
