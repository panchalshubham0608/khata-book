package com.khatabook

import android.webkit.JavascriptInterface

class AndroidBridge(
    private val activity: MainActivity,
    private val googleAuthManager: GoogleAuthManager,
    private val smsReader: SmsReader,
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

    @JavascriptInterface
    fun hasSmsPermission(): Boolean {
        return activity.hasSmsPermission()
    }

    @JavascriptInterface
    fun requestSmsPermission() {
        activity.runOnUiThread {
            activity.requestSmsPermission()
        }
    }

    @JavascriptInterface
    fun getSmsMessages(sinceTimestampMillis: Long): String {
        if (!activity.hasSmsPermission()) {
            return "[]"
        }
        return smsReader.getInboxMessages(sinceTimestampMillis)
    }

    @JavascriptInterface
    fun markSmsProcessed(smsId: String) {
        smsReader.markMessageProcessed(smsId)
    }

    @JavascriptInterface
    fun markSmsProcessedBatch(smsIdsJson: String) {
        try {
            val jsonArray = org.json.JSONArray(smsIdsJson)
            val ids = mutableListOf<String>()
            for (i in 0 until jsonArray.length()) {
                val id = jsonArray.optString(i)
                if (id.isNotBlank()) {
                    ids.add(id)
                }
            }
            smsReader.markMessagesProcessed(ids)
        } catch (_: Exception) {
            // ignore malformed JSON
        }
    }
}


