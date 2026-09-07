import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useVolumeSOS } from "@/hooks/useVolumeSOS";
import { runSosWorkflow } from "@/lib/sosWorkflow";
import { VoiceGuard, isVoiceGuardNative } from "@/lib/voiceGuard";

/**
 * App-wide native emergency triggers so voice commands and the volume 3x
 * shortcut work from any screen, not only from the page that mounted them.
 * Duplicate triggers are de-duplicated inside runSosWorkflow.
 */
export const NativeEmergency = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const userRef = useRef(user);
  userRef.current = user;

  // Voice Protection Mode detections (native Android foreground service)
  useEffect(() => {
    if (!isVoiceGuardNative()) return;
    let handle: { remove: () => void } | null = null;

    VoiceGuard.addListener("voiceEmergency", async ({ phrase }) => {
      const u = userRef.current;
      if (!u) return;
      toast.error(`Voice command "${phrase}" detected — sending SOS with live location…`);
      await runSosWorkflow(u.id, { type: "voice", callNumber: "112" });
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  // Volume 3x — Dashboard already handles it on its own screen
  useVolumeSOS(
    () => {
      const u = userRef.current;
      if (!u) return;
      toast.error("Volume 3x detected — sending SOS SMS & calling Police 100…");
      runSosWorkflow(u.id, { type: "sos", callNumber: "100" });
    },
    { enabled: !!user && pathname !== "/dashboard" },
  );

  return null;
};
