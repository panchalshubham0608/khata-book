package com.khatabook

import android.webkit.JavascriptInterface

class AndroidBridge(
    private val activity: MainActivity,
    private val googleAuthManager: GoogleAuthManager,
) {

    @JavascriptInterface
    fun signInWithGoogle() {
        googleAuthManager.signIn(
            onSuccess = { googleIdToken ->

                activity.runOnUiThread {
                    activity.sendGoogleTokenToWebView(
                        googleIdToken
                    )
                }
            },
            onFailure = { error ->

                activity.runOnUiThread {
                    activity.sendGoogleAuthError(
                        error.message ?: "Google sign-in failed"
                    )
                }
            }
        )
    }
}
