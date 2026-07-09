export type MicPermissionStatus = PermissionState | "unknown" | "unsupported";

export const getSpeechRecognitionCtor = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const isEmbeddedFrame = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const openCurrentPageInFullTab = () => {
  window.open(window.location.href, "_blank", "noopener,noreferrer");
};

export const stopMediaStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const getMicPermissionStatus = async (): Promise<MicPermissionStatus> => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }

  try {
    if (!navigator.permissions?.query) return "unknown";
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state as PermissionState;
  } catch {
    return "unknown";
  }
};

export const watchMicPermission = (onChange: (state: MicPermissionStatus) => void) => {
  let disposed = false;
  let removeListener: (() => void) | null = null;

  getMicPermissionStatus().then((state) => {
    if (!disposed) onChange(state);
  });

  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (disposed) return;
        const update = () => onChange(result.state as PermissionState);
        result.addEventListener("change", update);
        removeListener = () => result.removeEventListener("change", update);
      })
      .catch(() => undefined);
  }

  return () => {
    disposed = true;
    removeListener?.();
  };
};

export const requestMicrophoneStream = async () => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone access.");
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error("Microphone works only on secure HTTPS pages.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
};

export const getMicAccessErrorMessage = (error: unknown) => {
  const err = error as { name?: string; message?: string };
  const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";

  if (isEmbeddedFrame() && denied) {
    return "Mic preview iframe lo block ayindi. Open Full Tab tap chesi browser mic permission Allow cheyyandi.";
  }

  if (denied) {
    return "Mic permission blocked. Address bar lock icon → Site settings → Microphone → Allow cheyyandi.";
  }

  if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
    return "Microphone device dorakaledu. Phone/browser mic available unda check cheyyandi.";
  }

  return err?.message || "Microphone start avvaledu. Browser tab refresh chesi retry cheyyandi.";
};
