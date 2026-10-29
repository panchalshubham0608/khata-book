package com.khatabook

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    companion object {
        private const val TAG = "KhataBook"
    }

    private lateinit var webView: WebView
    private lateinit var googleAuthManager: GoogleAuthManager
    private lateinit var smsReader: SmsReader

    private val requestSmsPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            sendSmsPermissionResult(isGranted)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView.setWebContentsDebuggingEnabled(true)

        googleAuthManager = GoogleAuthManager(this)
        smsReader = SmsReader(this)

        setupWebView()
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                """window.dispatchEvent(new CustomEvent("nativeAppResumed"));""",
                null
            )
        }
    }

    private fun setupWebView() {

        webView = WebView(this)

        val assetLoader =
            WebViewAssetLoader.Builder()
                .addPathHandler(
                    "/assets/",
                    WebViewAssetLoader.AssetsPathHandler(this)
                )
                .build()

        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {

                Log.d(
                    TAG,
                    "Loading: ${request.url}"
                )

                return assetLoader.shouldInterceptRequest(
                    request.url
                )
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: android.webkit.WebResourceError
            ) {
                super.onReceivedError(
                    view,
                    request,
                    error
                )

                Log.e(
                    TAG,
                    "WebView error: ${request.url} - ${error.description}"
                )
            }

            override fun onPageFinished(
                view: WebView,
                url: String
            ) {
                super.onPageFinished(
                    view,
                    url
                )

                Log.d(
                    TAG,
                    "Page finished: $url"
                )
            }
        }

        webView.webChromeClient =
            WebChromeClient()

        webView.settings.apply {

            javaScriptEnabled = true

            domStorageEnabled = true

            allowFileAccess = false

            allowContentAccess = false

            allowFileAccessFromFileURLs = false

            allowUniversalAccessFromFileURLs = false
        }

        /*
         * Expose our native API to the React application.
         *
         * React can call:
         *
         * window.Android.signInWithGoogle()
         * window.Android.hasSmsPermission()
         * window.Android.requestSmsPermission()
         * window.Android.getSmsMessages(sinceTimestampMillis)
         */
        webView.addJavascriptInterface(
            AndroidBridge(
                this,
                googleAuthManager,
                smsReader
            ),
            "Android"
        )

        /*
         * React application bundled inside the APK.
         */
        webView.loadUrl(
            "https://appassets.androidplatform.net/assets/web/index.html"
        )

        setContentView(webView)
    }

    fun hasSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun requestSmsPermission() {
        if (hasSmsPermission()) {
            sendSmsPermissionResult(true)
            return
        }
        requestSmsPermissionLauncher.launch(Manifest.permission.READ_SMS)
    }

    fun sendSmsPermissionResult(granted: Boolean) {
        val javascript = """
            window.dispatchEvent(
                new CustomEvent(
                    "nativeSmsPermissionResult",
                    {
                        detail: {
                            granted: $granted
                        }
                    }
                )
            );
        """.trimIndent()

        runOnUiThread {
            webView.evaluateJavascript(
                javascript,
                null
            )
        }
    }

    /**
     * Called by AndroidBridge when native Google authentication
     * succeeds.
     *
     * The Google ID token is sent into the React application.
     */
    fun sendGoogleTokenToWebView(
        idToken: String
    ) {

        val escapedToken =
            JSONObject.quote(idToken)

        val javascript = """
            window.dispatchEvent(
                new CustomEvent(
                    "nativeGoogleSignIn",
                    {
                        detail: {
                            idToken: $escapedToken
                        }
                    }
                )
            );
        """.trimIndent()

        runOnUiThread {

            webView.evaluateJavascript(
                javascript,
                null
            )
        }
    }

    /**
     * Called by AndroidBridge if native Google authentication fails.
     */
    fun sendGoogleAuthError(
        message: String
    ) {

        val escapedMessage =
            JSONObject.quote(message)

        val javascript = """
            window.dispatchEvent(
                new CustomEvent(
                    "nativeGoogleSignInError",
                    {
                        detail: {
                            message: $escapedMessage
                        }
                    }
                )
            );
        """.trimIndent()

        runOnUiThread {

            webView.evaluateJavascript(
                javascript,
                null
            )
        }
    }

    override fun onDestroy() {
        webView.apply {
            removeJavascriptInterface(
                "Android"
            )
            stopLoading()
            destroy()
        }
        super.onDestroy()
    }
}