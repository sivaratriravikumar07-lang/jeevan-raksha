import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface VoiceGuardStatus {
  supported: boolean;
  recognitionAvailable: boolean;
  microphone: string;
  notifications: string;
  serviceActive: boolean;
  batteryUnrestricted: boolean;
  error?: string;
}

interface VoiceGuardPlugin {
  getStatus(): Promise<VoiceGuardStatus>;
  requestPermissions(): Promise<VoiceGuardStatus>;
  start(): Promise<VoiceGuardStatus>;
  stop(): Promise<VoiceGuardStatus>;
  openBatterySettings(): Promise<void>;
  addListener(
    event: "voiceEmergency",
    cb: (data: { phrase: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "voiceGuardState",
    cb: (data: { active: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}

const UNSUPPORTED: VoiceGuardStatus = {
  supported: false,
  recognitionAvailable: false,
  microphone: "unsupported",
  notifications: "unsupported",
  serviceActive: false,
  batteryUnrestricted: false,
};

const noop = async () => UNSUPPORTED;

const webFallback: VoiceGuardPlugin = {
  getStatus: noop,
  requestPermissions: noop,
  start: noop,
  stop: noop,
  openBatterySettings: async () => {},
  addListener: async () => ({ remove: async () => {} }) as PluginListenerHandle,
};

export const isVoiceGuardNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const VoiceGuard: VoiceGuardPlugin = isVoiceGuardNative()
  ? registerPlugin<VoiceGuardPlugin>("VoiceGuard", { web: webFallback })
  : webFallback;
