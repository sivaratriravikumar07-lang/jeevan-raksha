import { useEffect, useRef } from "react";

const VOLUME_KEYS = new Set([
  "AudioVolumeUp",
  "AudioVolumeDown",
  "VolumeUp",
  "VolumeDown",
]);
const VOLUME_CODES = new Set([174, 175, 183, 182]);

/**
 * Triple-press the hardware volume button (within `windowMs`) to dial Police 100.
 * Works on devices/browsers that surface volume keys as keyboard events
 * (most Android browsers, external keyboards, PWA/TWA installs).
 */
export const useVolumeSOS = (
  onTrigger: () => void,
  { presses = 3, windowMs = 2500, enabled = true } = {},
) => {
  const timesRef = useRef<number[]>([]);
  const cbRef = useRef(onTrigger);
  cbRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const isVolume =
        VOLUME_KEYS.has(e.key) || VOLUME_CODES.has(e.keyCode ?? -1);
      if (!isVolume) return;

      const now = Date.now();
      timesRef.current = [...timesRef.current, now].filter(
        (t) => now - t <= windowMs,
      );

      if (timesRef.current.length >= presses) {
        timesRef.current = [];
        cbRef.current();
      }
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, [enabled, presses, windowMs]);
};
