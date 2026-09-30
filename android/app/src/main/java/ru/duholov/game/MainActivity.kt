package ru.duholov.game

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONArray
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
        const val WRAPPER_VERSION = 15 // вместе с versionCode; minApk в www/version.json поднимать, только если старое приложение работать не должно
        private val OWN_HOSTS = setOf("duholov.ru", "appassets.androidplatform.net")
        // камеру получает только сама игра, не страницы сервисов входа (5.1: геолокации больше нет — игра без GPS)
        private fun isOwnOrigin(origin: String?) = origin != null && Uri.parse(origin).host == "duholov.ru"
        // 3: вход через Яндекс, VK и Telegram — внутри приложения, чтобы сервис вернул игрока прямо в игру
        // (Google во встроенные окна не пускает — эту кнопку игра в приложении не показывает)
        // 10: только страницы входа (раньше — любые *.yandex.ru и *.vk.com, то есть и чужой контент без адресной строки)
        private val AUTH_HOSTS = setOf("oauth.yandex.ru", "oauth.yandex.com", "passport.yandex.ru", "passport.yandex.com", "sso.passport.yandex.ru",
            "sso.yandex.ru", "sso.yandex.com", "id.vk.com", "oauth.vk.com", "login.vk.com", "vk.com", "m.vk.com", "oauth.telegram.org")
        private fun isAuthHost(host: String?) = host != null && host in AUTH_HOSTS
        // 6: оплата ЮKassa — внутри приложения: после оплаты ЮKassa возвращает на duholov.ru прямо в игру (раньше — в браузер,
        // где мог быть открыт другой аккаунт). Пока идёт оплата, страницы банка (3-D Secure) — тоже внутри
        private fun isPayHost(host: String?) = host != null && (host == "yoomoney.ru" || host.endsWith(".yoomoney.ru") ||
            host == "yookassa.ru" || host.endsWith(".yookassa.ru"))
        // ссылка СБП (qr.nspk.ru) — Android сам предложит приложение банка
        private fun isSbpHost(host: String?) = host != null && (host == "nspk.ru" || host.endsWith(".nspk.ru"))
    }

    private lateinit var web: WebView
    private lateinit var billing: Billing // 11: Google Play Billing (сборка play; в остальных — заглушка)
    private lateinit var yandexLogin: ActivityResultLauncher<YandexAuthLoginOptions>
    private var paying = false // 6: открыта оплата ЮKassa — до возврата на свои страницы
    private var pendingCamera: PermissionRequest? = null

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

    // 6: ссылка не на страницу (intent:, sberpay:, bank…: — приложение банка, СБП, SberPay, T-Pay) — открыть приложение;
    // intent: — только как ссылку из браузера (без явного компонента), нет приложения — его запасная страница
    private fun openApp(uri: Uri) {
        if (uri.scheme == "intent") {
            val intent = try { Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME) } catch (e: Exception) { return }
            intent.addCategory(Intent.CATEGORY_BROWSABLE)
            intent.component = null
            intent.selector = null
            // 10: ссылка не выдаёт приложению банка доступ к нашим файлам
            intent.flags = intent.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION).inv()
            try { startActivity(intent) } catch (e: ActivityNotFoundException) {
                // 10: запасная страница — только https и только во внешнем браузере (раньше открывалась в приложении —
                // так любая страница внутри могла выполнить javascript: или открыть чужой сайт без адресной строки)
                intent.getStringExtra("browser_fallback_url")?.let { Uri.parse(it) }?.takeIf { it.scheme == "https" }?.let { openExternal(it) }
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
        // 11: Android 15+ (targetSdk 35+) рисует окно от края до края — игра под строкой состояния и панелью навигации
        // не видна: отступы по системным панелям, вырезу экрана и клавиатуре задаёт рамка вокруг WebView
        val root = FrameLayout(this)
        root.setBackgroundColor(0xFF120C24.toInt())
        root.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        WindowCompat.getInsetsController(window, root).apply { isAppearanceLightStatusBars = false; isAppearanceLightNavigationBars = false }
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            WindowInsetsCompat.CONSUMED
        }
        billing = Billing(this) { o -> if (onGame()) web.evaluateJavascript("window.nativeBilling && window.nativeBilling($o)", null) }

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
            setGeolocationEnabled(false) // 5.1: игра без GPS — Ловчий ходит джойстиком
            // 10: явно — без доступа к файлам телефона и без http на https-страницах
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
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

        // 5: экран больше не держится включённым всегда (телефон грелся сильнее, чем с сайта: экран, GPS и карта работали без остановки, 5.1: GPS больше нет).
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

            // 11: Казна через Google Play (сборка play): наборы и цены, покупка, незасчитанные покупки → window.nativeBilling
            @JavascriptInterface
            fun billingProducts(ids: String) {
                val list = try { JSONArray(ids).let { a -> (0 until minOf(a.length(), 20)).map { a.getString(it) } } } catch (e: Exception) { emptyList() }
                runOnUiThread { if (onGame()) billing.products(list.filter { Regex("^[a-z0-9_.]{1,40}$").matches(it) }) }
            }

            @JavascriptInterface
            fun billingBuy(id: String, acct: String) {
                runOnUiThread { if (onGame() && Regex("^[a-z0-9_.]{1,40}$").matches(id) && Regex("^[0-9a-f]{16,64}$").matches(acct)) billing.buy(id, acct) }
            }

            @JavascriptInterface
            fun billingPending() {
                runOnUiThread { if (onGame()) billing.pending() }
            }
        }, "DuholovNative")

        web.setDownloadListener { url, _, _, _, _ -> openExternal(Uri.parse(url)) }

        web.webChromeClient = object : WebChromeClient() {
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
        billing.end()
        web.destroy()
        super.onDestroy()
    }
}
