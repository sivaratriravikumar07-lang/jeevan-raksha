import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

const VOLUME_KEYS = new Set([
  "AudioVolumeUp",
  "AudioVolumeDown",
  "VolumeUp",
  "VolumeDown",
]);
const VOLUME_CODES = new Set([174, 175, 183, 182]);

interface Options {
  presses?: number;
  windowMs?: number;
  enabled?: boolean;
}

/**
 * Triple-press the hardware volume button (within `windowMs`) to trigger SOS.
 * On native Android/iOS it uses the Capacitor Volume Buttons plugin.
 * On browsers it falls back to volume-key keyboard events.
 */
export const useVolumeSOS = (
  onTrigger: () => void,
  { presses = 3, windowMs = 2500, enabled = true }: Options = {},
) => {
  const timesRef = useRef<number[]>([]);
  const cbRef = useRef(onTrigger);
  cbRef.current = onTrigger;

  // Native Capacitor volume-button listener
  useEffect(() => {
    if (!enabled) return;
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    let active = true;

    (async () => {
      try {
        const { VolumeButtons } = await import("@capacitor-community/volume-buttons");
        if (!active) return;

        await VolumeButtons.watchVolume(
          { suppressVolumeIndicator: true },
          () => {
            const now = Date.now();
            timesRef.current = [...timesRef.current, now].filter(
              (t) => now - t <= windowMs,
            );
            if (timesRef.current.length >= presses) {
              timesRef.current = [];
              cbRef.current();
            }
          },
        );

        cleanup = () => {
          VolumeButtons.clearWatch().catch(() => {});
        };
      } catch (err) {
        console.warn("[useVolumeSOS] native volume plugin not available", err);
      }
    })();

    return () => {
      active = false;
      cleanup?.();
    };
  }, [enabled, presses, windowMs]);

  // Browser keyboard fallback
  useEffect(() => {
    if (!enabled) return;
    if (Capacitor.isNativePlatform()) return;

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
