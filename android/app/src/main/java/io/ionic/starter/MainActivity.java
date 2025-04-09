package io.ionic.starter;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.facebook.FacebookSdk; // Add this import statement
import com.getcapacitor.community.facebooklogin.FacebookLogin; // Add this import

public class MainActivity extends BridgeActivity {
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
        FacebookSdk.sdkInitialize(getApplicationContext());

    registerPlugin(GoogleAuth.class);

    registerPlugin(FacebookLogin.class); // Register Facebook Login plugin

  }
}
