package app.lovable.p3d70628152cc47c6bee826f8e0319848;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoiceGuardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
