package ru.duholov.game

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.os.CancellationSignal
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.json.JSONObject
import androidx.activity.result.ActivityResultLauncher
import com.yandex.authsdk.YandexAuthLoginOptions
import com.yandex.authsdk.YandexAuthOptions
import com.yandex.authsdk.YandexAuthResult
import com.yandex.authsdk.YandexAuthSdk
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader

/**
 * Приложение-обёртка: открывает игру с сайта, поэтому обновления игры приходят без переустановки.
 * Без сети (и если игра ещё не закэширована) показывается встроенная страница «Нет подключения».
 * Версия обёртки передаётся игре в User-Agent («DuholovApp/N») — по ней игра просит обновить само приложение.
 */
class MainActivity : ComponentActivity() {

    companion object {
        const val HOME = "https://duholov.ru/" // 4.1: игра переехала с quinsiege.github.io/duholov
        const val OFFLINE = "https://appassets.androidplatform.net/assets/offline.html"
        const val WRAPPER_VERSION = 9 // вместе с versionCode; minApk в www/version.json поднимать, только если старое приложение работать не должно
        private val OWN_HOSTS = setOf("duholov.ru", "appassets.androidplatform.net")
        // геолокацию и камеру получает только сама игра, не страницы сервисов входа
        private fun isOwnOrigin(origin: String?) = origin != null && Uri.parse(origin).host == "duholov.ru"
        // 3: вход через Яндекс, VK и Telegram — внутри приложения, чтобы сервис вернул игрока прямо в игру
        // (Google во встроенные окна не пускает — эту кнопку игра в приложении не показывает)
        private fun isAuthHost(host: String?) = host != null && (host == "oauth.yandex.ru" || host.endsWith(".yandex.ru") || host.endsWith(".yandex.com") ||
            host == "id.vk.com" || host == "vk.com" || host.endsWith(".vk.com") || host == "oauth.telegram.org")
        // 6: оплата ЮKassa — внутри приложения: после оплаты ЮKassa возвращает на duholov.ru прямо в игру (раньше — в браузер,
        // где мог быть открыт другой аккаунт). Пока идёт оплата, страницы банка (3-D Secure) — тоже внутри
        private fun isPayHost(host: String?) = host != null && (host == "yoomoney.ru" || host.endsWith(".yoomoney.ru") ||
            host == "yookassa.ru" || host.endsWith(".yookassa.ru"))
        // ссылка СБП (qr.nspk.ru) — Android сам предложит приложение банка
        private fun isSbpHost(host: String?) = host != null && (host == "nspk.ru" || host.endsWith(".nspk.ru"))
    }

    private lateinit var web: WebView
    private lateinit var yandexLogin: ActivityResultLauncher<YandexAuthLoginOptions>
    private var paying = false // 6: открыта оплата ЮKassa — до возврата на свои страницы
    private var pendingGeo: Pair<String, GeolocationPermissions.Callback>? = null
    private var pendingCamera: PermissionRequest? = null

    private val locationPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val granted = result.values.any { it }
            pendingGeo?.let { (origin, callback) -> callback.invoke(origin, granted, false) }
            pendingGeo = null
        }

    private val cameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingCamera?.let {
                if (granted) it.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) else it.deny()
            }
            pendingCamera = null
        }

    private fun has(permission: String) =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun openExternal(uri: Uri) {
        try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (e: ActivityNotFoundException) { /* нет браузера */ }
    }

    // 7: вход через Google — системное окно выбора аккаунта. Токен (id_token для веб-клиента игры, с nonce игры)
    // отдаётся только странице игры (duholov.ru): в приложении открываются и страницы ЮKassa, банков и сервисов входа
    private fun onGame() = Uri.parse(web.url ?: "").host == "duholov.ru"
    private fun signInGoogle(clientId: String, nonce: String) {
        if (!onGame()) return
        val option = GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        CredentialManager.create(this).getCredentialAsync(this, request, CancellationSignal(), ContextCompat.getMainExecutor(this),
            object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                override fun onResult(result: GetCredentialResponse) {
                    val c = result.credential
                    val token = if (c is CustomCredential && c.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)
                        GoogleIdTokenCredential.createFrom(c.data).idToken else null
                    googleResult(if (token != null) JSONObject().put("id_token", token) else JSONObject().put("error", "no_token"))
                }
                override fun onError(e: GetCredentialException) {
                    googleResult(JSONObject().put("error", if (e is GetCredentialCancellationException) "cancel" else "failed").put("message", e.message ?: e.type))
                }
            })
    }
    // 8: вход через Яндекс — приложение Яндекса (или окно входа Яндекса); токен — только странице игры
    private fun signInYandex() {
        if (!onGame()) return
        try { yandexLogin.launch(YandexAuthLoginOptions()) } catch (e: Exception) { yandexResult(JSONObject().put("error", "failed").put("message", e.message ?: "")) }
    }
    private fun yandexResult(o: JSONObject) {
        if (onGame()) web.evaluateJavascript("window.nativeYandex && window.nativeYandex($o)", null)
    }
    private fun googleResult(o: JSONObject) {
        if (onGame()) web.evaluateJavascript("window.nativeGoogle && window.nativeGoogle($o)", null)
    }

    // 9: положение только по сетям (Wi-Fi и вышки связи, без спутников) — игра сверяет с ним GPS: в России спутниковый
    // сигнал глушат и подменяют, а положение по сетям подмена не трогает. Ответ — window.nativeNetFix({ lat, lng, acc } | { error })
    private fun netFix() {
        val lm = getSystemService(LOCATION_SERVICE) as LocationManager
        var sent = false
        fun send(l: Location?) {
            if (sent) return
            sent = true
            val o = if (l != null) JSONObject().put("lat", l.latitude).put("lng", l.longitude).put("acc", l.accuracy.toDouble()).put("t", l.time)
                else JSONObject().put("error", "none")
            if (onGame()) web.evaluateJavascript("window.nativeNetFix && window.nativeNetFix($o)", null)
        }
        if (!onGame() || !(has(Manifest.permission.ACCESS_COARSE_LOCATION) || has(Manifest.permission.ACCESS_FINE_LOCATION))) return send(null)
        try {
            if (!lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) return send(null)
            if (Build.VERSION.SDK_INT >= 30) {
                lm.getCurrentLocation(LocationManager.NETWORK_PROVIDER, null, ContextCompat.getMainExecutor(this)) { send(it) }
            } else {
                val listener = object : LocationListener {
                    override fun onLocationChanged(l: Location) { lm.removeUpdates(this); send(l) }
                    override fun onProviderEnabled(provider: String) {}
                    override fun onProviderDisabled(provider: String) {}
                    @Deprecated("Deprecated in Java")
                    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                }
                @Suppress("DEPRECATION")
                lm.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, listener, mainLooper)
                web.postDelayed({ if (!sent) { lm.removeUpdates(listener); send(null) } }, 25000)
            }
        } catch (e: Exception) { send(null) }
    }

    // 6: ссылка не на страницу (intent:, sberpay:, bank…: — приложение банка, СБП, SberPay, T-Pay) — открыть приложение;
    // intent: — только как ссылку из браузера (без явного компонента), нет приложения — его запасная страница
    private fun openApp(uri: Uri) {
        if (uri.scheme == "intent") {
            val intent = try { Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME) } catch (e: Exception) { return }
            intent.addCategory(Intent.CATEGORY_BROWSABLE)
            intent.component = null
            intent.selector = null
            try { startActivity(intent) } catch (e: ActivityNotFoundException) {
                intent.getStringExtra("browser_fallback_url")?.let { web.loadUrl(it) }
            }
        } else openExternal(uri)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this)
        setContentView(web)

        // 8: вход через Яндекс — результат приходит сюда (регистрация — до старта активности)
        yandexLogin = registerForActivityResult(YandexAuthSdk.create(YandexAuthOptions(applicationContext)).contract) { result ->
            when (result) {
                is YandexAuthResult.Success -> yandexResult(JSONObject().put("access_token", result.token.value))
                is YandexAuthResult.Failure -> yandexResult(JSONObject().put("error", "failed").put("message", result.exception.message ?: ""))
                else -> yandexResult(JSONObject().put("error", "cancel"))
            }
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            setGeolocationEnabled(true)
            // канал распространения: у приложения из магазина игра не предлагает скачивать APK (обновления — через магазин)
            userAgentString = "$userAgentString DuholovApp/$WRAPPER_VERSION" + (if (BuildConfig.STORE != "site") " (store=${BuildConfig.STORE})" else "")
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            // свои страницы, вход через сервисы и оплата — внутри приложения; внешние ссылки и APK — в браузере
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val isWeb = url.scheme == "http" || url.scheme == "https"
                if (!isWeb) { openApp(url); return true }
                if (!request.isForMainFrame) return false // рамки внутри страницы (3-D Secure банка)
                if (url.path?.endsWith(".apk") == true || isSbpHost(url.host)) { openExternal(url); return true }
                if (url.host in OWN_HOSTS) { paying = false; return false }
                if (isPayHost(url.host)) { paying = true; return false }
                if (isAuthHost(url.host) || paying) return false
                openExternal(url)
                return true
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && request.url.host == Uri.parse(HOME).host) view.loadUrl(OFFLINE)
            }
        }

        // 5: экран больше не держится включённым всегда (телефон грелся сильнее, чем с сайта: экран, GPS и карта работали без остановки).
        // Не гасить экран — по настройке игры «Не гасить экран»: игра зовёт DuholovNative.keepScreenOn(true/false)
        web.addJavascriptInterface(object {
            @JavascriptInterface
            fun keepScreenOn(on: Boolean) {
                runOnUiThread {
                    if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }

            // 7: вход через Google (игра зовёт, если есть этот метод; ответ — window.nativeGoogle({ id_token } | { error }))
            @JavascriptInterface
            fun googleSignIn(clientId: String, nonce: String) {
                runOnUiThread { signInGoogle(clientId, nonce) }
            }

            // 8: вход через Яндекс (ответ — window.nativeYandex({ access_token } | { error }))
            @JavascriptInterface
            fun yandexSignIn() {
                runOnUiThread { signInYandex() }
            }

            // 9: положение по сетям (ответ — window.nativeNetFix)
            @JavascriptInterface
            fun netLocation() {
                runOnUiThread { netFix() }
            }
        }, "DuholovNative")

        web.setDownloadListener { url, _, _, _, _ -> openExternal(Uri.parse(url)) }

        web.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                if (!isOwnOrigin(origin)) {
                    callback.invoke(origin, false, false)
                } else if (has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeo = origin to callback
                    locationPermission.launch(
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                    )
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE in request.resources && isOwnOrigin(request.origin.toString())) {
                        if (has(Manifest.permission.CAMERA)) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                        } else {
                            pendingCamera = request
                            cameraPermission.launch(Manifest.permission.CAMERA)
                        }
                    } else {
                        request.deny()
                    }
                }
            }
        }

        // «Назад» закрывает окна игры; на карте — двойное нажатие для выхода
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // 6: на странице оплаты или входа «Назад» ведёт назад по страницам (в игру), а не закрывает приложение
                if (Uri.parse(web.url ?: HOME).host !in OWN_HOSTS) {
                    if (web.canGoBack()) web.goBack() else web.loadUrl(HOME)
                    return
                }
                web.evaluateJavascript("window.nativeBack ? window.nativeBack() : true") { result ->
                    if (result == "true") finish()
                }
            }
        })

        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl(HOME)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        web.resumeTimers()
    }

    override fun onPause() {
        web.pauseTimers() // таймеры игры не тикают в фоне (батарея)
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
