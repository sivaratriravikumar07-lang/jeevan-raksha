import { useRef, useState, useCallback } from "react";
import { Mic, Square, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  incidentId: string;
  userId: string;
}

export const AudioRecorder = ({ incidentId, userId }: Props) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fileName = `${userId}/${incidentId}/${Date.now()}.webm`;
        setUploading(true);
        const { error } = await supabase.storage.from("recordings").upload(fileName, blob, {
          contentType: "audio/webm",
          upsert: false,
        });
        setUploading(false);
        if (error) {
          toast.error("Upload failed: " + error.message);
        } else {
          toast.success("Recording saved securely.");
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied.");
    }
  }, [incidentId, userId]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  const format = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="flex items-center gap-3">
      {!recording ? (
        <button
          onClick={start}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          <Mic className="w-4 h-4" /> Record Audio
        </button>
      ) : (
        <button
          onClick={stop}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold animate-pulse active:scale-95 transition-transform"
        >
          <Square className="w-4 h-4" /> Stop ({format(seconds)})
        </button>
      )}
      {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
    </div>
  );
};
