import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Video, StopCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Stealth capture: silent photo + short video, auto-upload to secure evidence bucket.
const StealthCapture = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  const start = async (mode: "user" | "environment" = facing) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: true });
      streamRef.current = s;
      setFacing(mode);
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
    } catch (e:any) { toast.error("Camera permission needed"); }
  };

  useEffect(() => { start("environment"); return () => streamRef.current?.getTracks().forEach(t => t.stop()); // eslint-disable-next-line
  }, []);

  const upload = async (blob: Blob, ext: string) => {
    if (!user) return toast.error("Sign in first");
    setBusy(true);
    const path = `${user.id}/${Date.now()}-stealth.${ext}`;
    const { error } = await supabase.storage.from("recordings").upload(path, blob, { contentType: blob.type });
    setBusy(false);
    if (error) toast.error("Upload failed: " + error.message);
    else toast.success("Evidence saved securely 🔒");
  };

  const snap = async () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && upload(b, "jpg"), "image/jpeg", 0.9);
  };

  const toggleRec = () => {
    if (recording) { recorderRef.current?.stop(); return; }
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      upload(blob, "webm");
      setRecording(false);
    };
    mr.start();
    recorderRef.current = mr;
    setRecording(true);
    setTimeout(() => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }, 30000);
  };

  const flip = async () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    await start(facing === "user" ? "environment" : "user");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <span className="text-sm font-semibold">Stealth Evidence</span>
        <button onClick={flip} className="text-xs opacity-70">Flip</button>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {recording && <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-primary text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC</div>}
        {busy && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}
      </div>

      <div className="p-6 grid grid-cols-2 gap-3">
        <Button size="lg" onClick={snap} className="bg-white text-black hover:bg-white/90"><Camera className="w-5 h-5 mr-2" /> Snap</Button>
        <Button size="lg" onClick={toggleRec} className={recording ? "bg-primary" : "bg-secondary"}>
          {recording ? <><StopCircle className="w-5 h-5 mr-2" /> Stop</> : <><Video className="w-5 h-5 mr-2" /> Record 30s</>}
        </Button>
      </div>
      <p className="text-[10px] text-white/50 text-center pb-4 px-4">Silent capture · uploads to your private evidence vault</p>
    </div>
  );
};

export default StealthCapture;
