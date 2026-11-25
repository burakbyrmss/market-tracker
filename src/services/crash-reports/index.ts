import * as Sentry from '@sentry/react-native';

type CrashReportOptions = Parameters<typeof Sentry.init>[0];

// ADR 0009: crash reports only. Every switch that sends something other than a crash is off,
// including the ones Sentry turns on by default (sessions, automatic tracing, failed requests).
export function crashReportOptions(dsn: string | undefined, isDev: boolean): CrashReportOptions {
  return {
    ...(dsn ? { dsn } : {}),
    // No DSN means no Sentry project yet. A development build never reports.
    enabled: Boolean(dsn) && !isDev,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableUserInteractionTracing: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    enableAppHangTracking: false,
    enableCaptureFailedRequests: false,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: (event) => {
      // Sentry never gets a user, even one an integration fills in.
      delete event.user;
      return event;
    },
  };
}

export function startCrashReports(): void {
  Sentry.init(crashReportOptions(process.env.EXPO_PUBLIC_SENTRY_DSN, __DEV__));
}
