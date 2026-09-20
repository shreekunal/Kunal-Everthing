package com.kunal.os;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "NativeBiometric")
public class NativeBiometricPlugin extends Plugin {

    private BiometricPrompt activePrompt = null;
    private boolean isPromptActive = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int canAuthenticate = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
            );

            JSObject ret = new JSObject();
            if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS) {
                ret.put("isAvailable", true);
                ret.put("biometryType", "fingerprint");
            } else {
                ret.put("isAvailable", false);
                ret.put("error", getErrorMessage(canAuthenticate));
            }
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("isAvailable", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void cancelAuthentication(PluginCall call) {
        if (getActivity() == null) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                if (activePrompt != null) {
                    activePrompt.cancelAuthentication();
                    activePrompt = null;
                }
                isPromptActive = false;
                JSObject ret = new JSObject();
                ret.put("cancelled", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to cancel biometric prompt: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (getActivity() == null || getActivity().isFinishing()) {
            call.reject("Host activity unavailable.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                isPromptActive = true;
                Executor executor = ContextCompat.getMainExecutor(getContext());

                String title = call.getString("title", "Everything Security");
                String subtitle = call.getString("subtitle", "Verify your fingerprint");
                String description = call.getString("reason", "Touch fingerprint sensor to continue");

                BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setDescription(description)
                        .setAllowedAuthenticators(
                                BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
                        )
                        .setNegativeButtonText("Cancel");

                BiometricPrompt.PromptInfo promptInfo = builder.build();

                FragmentActivity fragmentActivity = (FragmentActivity) getActivity();
                activePrompt = new BiometricPrompt(fragmentActivity, executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                isPromptActive = false;
                                activePrompt = null;
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                call.resolve(ret);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                isPromptActive = false;
                                activePrompt = null;

                                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                                    call.reject("Authentication cancelled by user.");
                                } else if (errorCode == BiometricPrompt.ERROR_LOCKOUT) {
                                    call.reject("Too many failed attempts. Biometric sensor locked for 30 seconds. Enter PIN.");
                                } else if (errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT) {
                                    call.reject("Too many failed attempts. Biometric sensor locked. Master PIN required.");
                                } else {
                                    call.reject(errString.toString());
                                }
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                super.onAuthenticationFailed();
                                // Fingerprint not recognized; prompt remains open for retries
                            }
                        });

                activePrompt.authenticate(promptInfo);
            } catch (Exception e) {
                isPromptActive = false;
                activePrompt = null;
                call.reject("Biometric prompt error: " + e.getMessage());
            }
        });
    }

    private String getErrorMessage(int errorCode) {
        switch (errorCode) {
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "No biometric hardware found on this device.";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "Biometric hardware is currently unavailable.";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "No fingerprint enrolled in device settings.";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "Security update required for biometrics.";
            default:
                return "Biometrics not available.";
        }
    }
}
