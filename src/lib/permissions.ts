export type PermState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported"
  | "frame-blocked"
  | "unknown";

export type PermKey = "location" | "microphone" | "camera" | "notifications" | "motion";

export interface PermInfo {
  key: PermKey;
  label: string;
  why: string;
}

export const PERMISSIONS: PermInfo[] = [
  { key: "location", label: "Live Location (GPS)", why: "SOS, safe zones, journey tracking, nearby police & hospitals" },
  { key: "microphone", label: "Microphone", why: "Voice command 'Help Me' + scream/crash sound detection" },
  { key: "camera", label: "Camera", why: "Stealth photo & video evidence capture" },
  { key: "notifications", label: "Notifications", why: "Alerts when you exit a safe zone or a responder replies" },
  { key: "motion", label: "Motion sensors", why: "Fall / crash detection while travelling" },
];

const queryPerm = async (name: string): Promise<PermState> => {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const r = await navigator.permissions.query({ name: name as PermissionName });
    return r.state as PermState;
  } catch {
    return "unknown";
  }
};

export const isEmbedded = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/** Permissions-Policy check — iframes (preview) often block camera/mic/geolocation. */
export const featureAllowed = (feature: string): boolean => {
  try {
    const fp: any = (document as any).featurePolicy || (document as any).permissionsPolicy;
    if (fp?.allowsFeature) return fp.allowsFeature(feature);
  } catch {
    /* noop */
  }
  return true;
};

/** Notifications never work inside a cross-origin iframe. */
const notificationsBlockedByFrame = () => isEmbedded();

export const readPermission = async (key: PermKey): Promise<PermState> => {
  switch (key) {
    case "location":
      if (!("geolocation" in navigator)) return "unsupported";
      if (!featureAllowed("geolocation")) return "frame-blocked";
      return queryPerm("geolocation");
    case "microphone":
      if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
      if (!featureAllowed("microphone")) return "frame-blocked";
      return queryPerm("microphone");
    case "camera":
      if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
      if (!featureAllowed("camera")) return "frame-blocked";
      return queryPerm("camera");
    case "notifications":
      if (typeof Notification === "undefined") return "unsupported";
      if (Notification.permission === "default" && notificationsBlockedByFrame()) return "frame-blocked";
      return Notification.permission === "default" ? "prompt" : (Notification.permission as PermState);
    case "motion": {
      const anyDME = (window as any).DeviceMotionEvent;
      if (!anyDME) return "unsupported";
      return typeof anyDME.requestPermission === "function" ? "prompt" : "granted";
    }
  }
};

export const readAllPermissions = async (): Promise<Record<PermKey, PermState>> => {
  const entries = await Promise.all(
    PERMISSIONS.map(async (p) => [p.key, await readPermission(p.key)] as const),
  );
  return Object.fromEntries(entries) as Record<PermKey, PermState>;
};

const stopStream = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

export const requestPermission = async (key: PermKey): Promise<PermState> => {
  const pre = await readPermission(key);
  if (pre === "frame-blocked" || pre === "unsupported") return pre;
  try {
    switch (key) {
      case "location":
        await new Promise<void>((res, rej) =>
          navigator.geolocation.getCurrentPosition(() => res(), rej, { enableHighAccuracy: true, timeout: 15000 }),
        );
        return "granted";
      case "microphone": {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        stopStream(s);
        return "granted";
      }
      case "camera": {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        stopStream(s);
        return "granted";
      }
      case "notifications": {
        const r = await Notification.requestPermission();
        return r === "default" ? "prompt" : (r as PermState);
      }
      case "motion": {
        const anyDME = (window as any).DeviceMotionEvent;
        if (typeof anyDME?.requestPermission === "function") {
          const r = await anyDME.requestPermission();
          return r === "granted" ? "granted" : "denied";
        }
        return "granted";
      }
    }
  } catch (e: any) {
    if (e?.name === "NotAllowedError" && isEmbedded() && !featureAllowed(key === "camera" ? "camera" : key === "microphone" ? "microphone" : "geolocation")) {
      return "frame-blocked";
    }
    return "denied";
  }
};

/** Ask for everything, one after another (browsers reject parallel prompts). */
export const requestAllPermissions = async (
  onStep?: (key: PermKey, state: PermState) => void,
): Promise<Record<PermKey, PermState>> => {
  const out: Partial<Record<PermKey, PermState>> = {};
  for (const p of PERMISSIONS) {
    const current = await readPermission(p.key);
    const state = current === "granted" || current === "unsupported" ? current : await requestPermission(p.key);
    out[p.key] = state;
    onStep?.(p.key, state);
  }
  return out as Record<PermKey, PermState>;
};

export const watchPermissions = (onChange: () => void) => {
  const names = ["geolocation", "microphone", "camera", "notifications"];
  const cleanups: Array<() => void> = [];
  names.forEach((n) => {
    navigator.permissions
      ?.query({ name: n as PermissionName })
      .then((r) => {
        r.addEventListener("change", onChange);
        cleanups.push(() => r.removeEventListener("change", onChange));
      })
      .catch(() => undefined);
  });
  return () => cleanups.forEach((c) => c());
};

export const openInFullTab = () => window.open(window.location.href, "_blank", "noopener,noreferrer");
