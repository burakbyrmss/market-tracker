// THROWAWAY M2 spike code. Never merge.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export type RunResult = { js: number[]; ui: number[] };

// Counts frames per second on the JS thread (requestAnimationFrame) and on the UI thread
// (Reanimated frame callback). A run collects one sample per second for each thread.
export function useFpsRun(seconds: number) {
  const [live, setLive] = useState({ js: 0, ui: 0 });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const samples = useRef<RunResult>({ js: [], ui: [] });
  const runningRef = useRef(false);

  const onUiSecond = useCallback((fps: number) => {
    setLive((l) => ({ ...l, ui: fps }));
    if (runningRef.current) samples.current.ui.push(fps);
  }, []);

  const uiFrames = useSharedValue(0);
  const uiStart = useSharedValue(0);
  useFrameCallback((frame) => {
    'worklet';
    if (uiStart.value === 0) uiStart.value = frame.timestamp;
    uiFrames.value += 1;
    const elapsed = frame.timestamp - uiStart.value;
    if (elapsed >= 1000) {
      scheduleOnRN(onUiSecond, Math.round((uiFrames.value * 1000) / elapsed));
      uiFrames.value = 0;
      uiStart.value = frame.timestamp;
    }
  });

  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let handle = requestAnimationFrame(function tick(now) {
      frames += 1;
      const elapsed = now - start;
      if (elapsed >= 1000) {
        const fps = Math.round((frames * 1000) / elapsed);
        setLive((l) => ({ ...l, js: fps }));
        if (runningRef.current) samples.current.js.push(fps);
        frames = 0;
        start = now;
      }
      handle = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const start = useCallback(() => {
    samples.current = { js: [], ui: [] };
    runningRef.current = true;
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      runningRef.current = false;
      setRunning(false);
      setResult({ js: [...samples.current.js], ui: [...samples.current.ui] });
    }, seconds * 1000);
  }, [seconds]);

  return { live, running, result, start };
}

export function summarize(values: number[]) {
  if (values.length === 0) return 'no samples';
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  return `median ${median} · p10 ${p10} · min ${sorted[0]} · n=${values.length}`;
}
