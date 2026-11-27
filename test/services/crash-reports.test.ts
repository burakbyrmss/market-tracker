import * as Sentry from '@sentry/react-native';

import { crashReportOptions, startCrashReports } from '@/services/crash-reports';

const mockSetTag = jest.fn();
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  getGlobalScope: () => ({ setTag: mockSetTag }),
}));
jest.mock('expo-updates', () => ({
  updateId: 'update-1',
  isEmbeddedLaunch: false,
  channel: 'production',
}));

type Options = ReturnType<typeof crashReportOptions>;
type SentEvent = Parameters<NonNullable<Options['beforeSend']>>[0];

const DSN = 'https://public@o0.ingest.sentry.io/0';

test('a release build with a DSN reports crashes and nothing else (ADR 0009)', () => {
  const options = crashReportOptions(DSN, false);
  expect(options).toMatchObject({
    dsn: DSN,
    enabled: true,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableUserInteractionTracing: false,
    enableCaptureFailedRequests: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
});

test('a crash report never carries a user', () => {
  const { beforeSend } = crashReportOptions(DSN, false);
  const event = { message: 'boom', user: { id: '42', ip_address: '{{auto}}' } } as SentEvent;
  const sent = beforeSend?.(event, {});
  expect(sent).toEqual({ message: 'boom' });
});

test('without a DSN, or in a development build, nothing is sent', () => {
  expect(crashReportOptions(undefined, false).enabled).toBe(false);
  expect(crashReportOptions(DSN, true).enabled).toBe(false);
});

test('starts Sentry from the public DSN in the build environment', () => {
  startCrashReports();
  // Jest runs as a development build, and the test environment sets no DSN.
  expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
});

test('tags each report with the EAS Update it ran', () => {
  startCrashReports();
  expect(mockSetTag).toHaveBeenCalledWith('expo-update-id', 'update-1');
  expect(mockSetTag).toHaveBeenCalledWith('expo-is-embedded-update', 'false');
  expect(mockSetTag).toHaveBeenCalledWith('expo-channel', 'production');
});
