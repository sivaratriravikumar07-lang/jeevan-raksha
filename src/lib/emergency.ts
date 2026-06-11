// Emergency utilities: siren, location, vibration

let sirenCtx: AudioContext | null = null;
let sirenNodes: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode } | null = null;

export const startSiren = () => {
  if (sirenCtx) return;
  try {
    sirenCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = sirenCtx.createOscillator();
    const gain = sirenCtx.createGain();
    const lfo = sirenCtx.createOscillator();
    const lfoGain = sirenCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 800;
    lfo.frequency.value = 4;
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.value = 0.25;
    osc.connect(gain).connect(sirenCtx.destination);
    osc.start();
    lfo.start();
    sirenNodes = { osc, gain, lfo, lfoGain };
  } catch (e) { console.error(e); }
};

export const stopSiren = () => {
  try {
    sirenNodes?.osc.stop();
    sirenNodes?.lfo.stop();
    sirenCtx?.close();
  } catch {}
  sirenCtx = null;
  sirenNodes = null;
};

export const vibrate = (pattern: number | number[] = [200, 100, 200, 100, 400]) => {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
};

export const getCurrentPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });

export const watchPosition = (cb: (p: GeolocationPosition) => void): number => {
  return navigator.geolocation.watchPosition(cb, (e) => console.error(e), { enableHighAccuracy: true, maximumAge: 5000 });
};

export const clearWatch = (id: number) => navigator.geolocation.clearWatch(id);
