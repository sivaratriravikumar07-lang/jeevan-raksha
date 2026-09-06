package app.lovable.p3d70628152cc47c6bee826f8e0319848;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Native foreground service that listens for emergency voice commands.
 * Audio is processed on-device by Android SpeechRecognizer and is never stored
 * or uploaded by this service.
 */
public class VoiceGuardService extends Service {

    public static final String TAG = "VoiceGuardService";
    public static final String CHANNEL_ID = "jr_voice_guard";
    public static final String ALERT_CHANNEL_ID = "jr_voice_alert";
    public static final int NOTIF_ID = 4711;

    public static final String ACTION_START = "app.lovable.jeevanraksha.VOICE_START";
    public static final String ACTION_STOP = "app.lovable.jeevanraksha.VOICE_STOP";

    private static volatile boolean running = false;

    /** Set by the Capacitor plugin so detections can be forwarded to the web layer. */
    public interface EmergencyListener {
        void onEmergencyPhrase(String phrase);
        void onStateChanged(boolean active);
    }

    private static EmergencyListener listener;

    public static void setListener(EmergencyListener l) {
        listener = l;
    }

    public static boolean isRunning() {
        return running;
    }

    private static final List<String> PHRASES = Arrays.asList(
            "help me",
            "help",
            "save me",
            "emergency",
            "jeevan raksha",
            "jeevan raksha help",
            "bachao",
            "sos"
    );

    private SpeechRecognizer recognizer;
    private Intent recognizerIntent;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean shouldListen = false;
    private long lastTrigger = 0L;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            stopEverything();
            return START_NOT_STICKY;
        }

        startAsForeground();
        running = true;
        if (listener != null) listener.onStateChanged(true);

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Log.w(TAG, "Speech recognition not available on this device");
            return START_STICKY;
        }

        shouldListen = true;
        handler.post(this::initRecognizer);
        return START_STICKY;
    }

    private void startAsForeground() {
        Notification notification = buildOngoingNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIF_ID, notification);
        }
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            NotificationChannel ongoing = new NotificationChannel(
                    CHANNEL_ID, "Safety Protection", NotificationManager.IMPORTANCE_LOW);
            ongoing.setDescription("Shows while emergency voice monitoring is active");
            nm.createNotificationChannel(ongoing);

            NotificationChannel alert = new NotificationChannel(
                    ALERT_CHANNEL_ID, "Emergency Alerts", NotificationManager.IMPORTANCE_HIGH);
            alert.setDescription("Emergency voice command detected");
            nm.createNotificationChannel(alert);
        }
    }

    private PendingIntent appIntent() {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 0, open, flags);
    }

    private Notification buildOngoingNotification() {
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return b.setContentTitle("Jeevan Raksha Safety Protection Active")
                .setContentText("Listening for emergency voice commands")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setOngoing(true)
                .setContentIntent(appIntent())
                .build();
    }

    private void showEmergencyNotification(String phrase) {
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, ALERT_CHANNEL_ID)
                : new Notification.Builder(this);
        Notification n = b.setContentTitle("Emergency detected")
                .setContentText("Voice command \"" + phrase + "\" — sending SOS alert")
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setAutoCancel(true)
                .setContentIntent(appIntent())
                .build();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID + 1, n);
    }

    private void initRecognizer() {
        if (recognizer != null) return;
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        }

        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}

            @Override public void onError(int error) {
                restartSoon(error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? 1200 : 500);
            }

            @Override public void onResults(Bundle results) {
                handleTranscripts(results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION));
                restartSoon(300);
            }

            @Override public void onPartialResults(Bundle partialResults) {
                handleTranscripts(partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION));
            }

            @Override public void onEvent(int eventType, Bundle params) {}
        });

        startListening();
    }

    private void handleTranscripts(ArrayList<String> matches) {
        if (matches == null) return;
        for (String raw : matches) {
            if (raw == null) continue;
            String text = raw.toLowerCase(Locale.ROOT).trim();
            for (String phrase : PHRASES) {
                if (text.contains(phrase)) {
                    trigger(phrase);
                    return;
                }
            }
        }
    }

    private void trigger(String phrase) {
        long now = System.currentTimeMillis();
        if (now - lastTrigger < 8000) return;
        lastTrigger = now;

        showEmergencyNotification(phrase);

        // Bring the app to the foreground so the shared SOS workflow can run.
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("voiceEmergency", phrase);
        try {
            startActivity(open);
        } catch (Exception e) {
            Log.w(TAG, "Could not launch activity", e);
        }

        if (listener != null) listener.onEmergencyPhrase(phrase);
    }

    private void restartSoon(long delayMs) {
        if (!shouldListen) return;
        handler.postDelayed(this::startListening, delayMs);
    }

    private void startListening() {
        if (!shouldListen || recognizer == null) return;
        try {
            recognizer.cancel();
            recognizer.startListening(recognizerIntent);
        } catch (Exception e) {
            Log.w(TAG, "startListening failed", e);
            restartSoon(1500);
        }
    }

    private void stopEverything() {
        shouldListen = false;
        running = false;
        handler.removeCallbacksAndMessages(null);
        if (recognizer != null) {
            try {
                recognizer.cancel();
                recognizer.destroy();
            } catch (Exception ignored) {}
            recognizer = null;
        }
        if (listener != null) listener.onStateChanged(false);
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopEverything();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
