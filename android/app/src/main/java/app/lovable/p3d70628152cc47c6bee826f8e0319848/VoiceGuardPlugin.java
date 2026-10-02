package app.lovable.p3d70628152cc47c6bee826f8e0319848;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.SpeechRecognizer;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "VoiceGuard",
        permissions = {
                @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO}),
                @Permission(alias = "notifications", strings = {"android.permission.POST_NOTIFICATIONS"}),
                @Permission(alias = "phone", strings = {Manifest.permission.CALL_PHONE})
        }
)
public class VoiceGuardPlugin extends Plugin {

    @Override
    public void load() {
        VoiceGuardService.setListener(new VoiceGuardService.EmergencyListener() {
            @Override
            public void onEmergencyPhrase(String phrase) {
                JSObject data = new JSObject();
                data.put("phrase", phrase);
                notifyListeners("voiceEmergency", data, true);
            }

            @Override
            public void onStateChanged(boolean active) {
                JSObject data = new JSObject();
                data.put("active", active);
                notifyListeners("voiceGuardState", data, true);
            }
        });
    }

    private boolean micGranted() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject statusObject() {
        JSObject res = new JSObject();
        res.put("supported", true);
        res.put("recognitionAvailable", SpeechRecognizer.isRecognitionAvailable(getContext()));
        res.put("microphone", micGranted() ? "granted" : getPermissionState("microphone").toString());
        res.put("notifications", Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                ? "granted" : getPermissionState("notifications").toString());
        res.put("serviceActive", VoiceGuardService.isRunning());
        res.put("batteryUnrestricted", isIgnoringBatteryOptimizations());
        return res;
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(statusObject());
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (micGranted()) {
            call.resolve(statusObject());
            return;
        }
        requestPermissionForAliases(new String[]{"microphone", "notifications"}, call, "permsCallback");
    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        call.resolve(statusObject());
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!micGranted()) {
            requestPermissionForAliases(new String[]{"microphone", "notifications"}, call, "startAfterPerms");
            return;
        }
        launchService(call);
    }

    @PermissionCallback
    private void startAfterPerms(PluginCall call) {
        if (!micGranted()) {
            JSObject res = statusObject();
            res.put("error", "microphone_denied");
            call.resolve(res);
            return;
        }
        launchService(call);
    }

    private void launchService(PluginCall call) {
        Intent intent = new Intent(getContext(), VoiceGuardService.class);
        intent.setAction(VoiceGuardService.ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve(statusObject());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), VoiceGuardService.class);
        intent.setAction(VoiceGuardService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve(statusObject());
    }

    @PluginMethod
    public void callNow(PluginCall call) {
        String number = call.getString("number", "112");
        if (getPermissionState("phone") != PermissionState.GRANTED) {
            requestPermissionForAlias("phone", call, "callPermCallback");
            return;
        }
        placeCall(call, number);
    }

    @PermissionCallback
    private void callPermCallback(PluginCall call) {
        placeCall(call, call.getString("number", "112"));
    }

    private void placeCall(PluginCall call, String number) {
        try {
            boolean granted = getPermissionState("phone") == PermissionState.GRANTED;
            Intent intent = new Intent(granted ? Intent.ACTION_CALL : Intent.ACTION_DIAL, Uri.parse("tel:" + number));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject r = new JSObject(); r.put("direct", granted); call.resolve(r);
        } catch (Exception e) {
            call.reject("Call failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open battery settings: " + e.getMessage());
        }
    }
}
