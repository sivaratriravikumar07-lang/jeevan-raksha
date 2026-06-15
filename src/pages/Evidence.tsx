import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Camera, Video, StopCircle, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Item { name: string; url: string; type: "image" | "video"; created: string }

const Evidence = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase.storage.from("recordings").list(`${user.id}/evidence`, {
      limit: 50, sortBy: { column: "created_at", order: "desc" },
    });
    if (!data) return;
    const enriched = await Promise.all(
      data.map(async (f) => {
        const { data: signed } = await supabase.storage
          .from("recordings")
          .createSignedUrl(`${user.id}/evidence/${f.name}`, 60 * 60);
        return {
          name: f.name,
          url: signed?.signedUrl ?? "",
          type: (f.name.endsWith(".webm") ? "video" : "image") as "image" | "video",
          created: f.created_at ?? "",
        };
      })
    );
    setItems(enriched.filter((i) => i.url));
  };

  useEffect(() => { loadItems(); /* eslint-disable-next-line */ }, [user]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e: any) { toast.error("Camera denied: " + e.message); }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  useEffect(() => () => closeCamera(), []);

  const upload = async (blob: Blob, ext: string) => {
    if (!user) return;
    setBusy(true);
    const name = `incident-${Date.now()}.${ext}`;
    const path = `${user.id}/evidence/${name}`;
    const { error } = await supabase.storage.from("recordings").upload(path, blob, {
      contentType: blob.type, upsert: false,
    });
    setBusy(false);
    if (error) return toast.error("Upload failed: " + error.message);
    toast.success("Evidence saved securely");
    loadItems();
  };

  const snapPhoto = async () => {
    if (!streamRef.current || !videoRef.current) return toast.error("Open camera first");
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
    await upload(blob, "jpg");
  };

  const startRec = async () => {
    if (!streamRef.current) await openCamera();
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      await upload(blob, "webm");
      setRecording(false);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    // Auto-stop after 15s
    setTimeout(() => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }, 15000);
  };
  const stopRec = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-bold text-lg flex items-center gap-2"><Camera className="w-5 h-5" /> Evidence Capture</h1>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="aspect-video bg-black flex items-center justify-center">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            {!streamRef.current && <span className="absolute text-xs text-white/60">Camera off</span>}
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {!streamRef.current ? (
              <Button onClick={openCamera} className="col-span-3"><Camera className="w-4 h-4 mr-2" />Open Camera</Button>
            ) : (
              <>
                <Button onClick={snapPhoto} disabled={busy}><ImageIcon className="w-4 h-4 mr-1" />Photo</Button>
                {!recording ? (
                  <Button onClick={startRec} className="bg-gradient-emergency" disabled={busy}><Video className="w-4 h-4 mr-1" />Record 15s</Button>
                ) : (
                  <Button onClick={stopRec} variant="destructive"><StopCircle className="w-4 h-4 mr-1" />Stop</Button>
                )}
                <Button onClick={closeCamera} variant="outline">Close</Button>
              </>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Saved evidence ({items.length})
          </h2>
          {items.length === 0 ? (
            <div className="text-xs text-muted-foreground bg-muted/40 p-4 rounded-xl text-center">No evidence captured yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {items.map((it) => (
                <a key={it.name} href={it.url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-border bg-card">
                  {it.type === "image"
                    ? <img src={it.url} alt={it.name} className="w-full aspect-square object-cover" />
                    : <video src={it.url} className="w-full aspect-square object-cover" />}
                  <div className="p-2 text-[10px] text-muted-foreground truncate">{new Date(it.created).toLocaleString()}</div>
                </a>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground p-3 bg-muted/40 rounded-xl">
          ⓘ All files stored privately in your secure cloud vault. Only you can view via signed links.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Evidence;
