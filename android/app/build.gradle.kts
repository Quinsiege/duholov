plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.duholov.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "ru.duholov.game"
        minSdk = 24
        targetSdk = 36 // 11: Google Play — новые приложения и обновления с 31.08.2026 — API 36
        // versionCode = MainActivity.WRAPPER_VERSION; minApk в www/version.json — не выше
        versionCode = 15
        versionName = "5.1.11"
        // 11: версия для Google Play (flavor play): Android 16, оплата через Google Play, обновления — через Play
        // 10: запасная ссылка intent: — только https во внешнем браузере; вход — только страницы входа; без переноса данных
        // 9: положение по сетям для защиты от подмены GPS (DuholovNative.netLocation)
        // 8: вход через Яндекс в приложении (Yandex LoginSDK) — ID приложения Яндекса публичный (игра отдаёт его каждому клиенту)
        manifestPlaceholders["YANDEX_CLIENT_ID"] = "03990507cbdf4990b2cb031891caa4d7"
    }

    // 4.3.2: где распространяется приложение. site — APK с сайта duholov.ru (обновление — скачать APK),
    // rustore — магазин RuStore (обновления — только через магазин). Игра узнаёт канал по User-Agent («store=…»).
    flavorDimensions += "store"
    productFlavors {
        create("site") { dimension = "store"; buildConfigField("String", "STORE", "\"site\"") }
        create("rustore") { dimension = "store"; buildConfigField("String", "STORE", "\"rustore\"") }
        // 11: Google Play — AAB для Play Console; покупки Казны только через Google Play, обновления — только через Play
        create("play") { dimension = "store"; buildConfigField("String", "STORE", "\"play\"") }
    }
    buildFeatures { buildConfig = true }

    // 4.1: релизная подпись постоянным ключом — иначе новое приложение не ставится поверх старого.
    // Ключ и пароль — в секретах GitHub (ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD), CI кладёт файл
    // и передаёт путь в ANDROID_KEYSTORE_FILE. Без них (проверки Pull Request) собирается только debug.
    val keystore = System.getenv("ANDROID_KEYSTORE_FILE")
    signingConfigs {
        if (keystore != null) {
            create("release") {
                storeFile = file(keystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = "duholov"
                keyPassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // 15: R8 — сжатие и оптимизация кода (Play: «Оптимизация DEX», «Обфускация»); карта деобфускации уходит в AAB сама.
            // Мост JS (@JavascriptInterface) и библиотеки входа — в proguard-rules.pro
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystore != null) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    // Игра открывается с сайта (MainActivity.HOME); в APK лежит только страница «Нет подключения».
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")
    // 7: вход через Google в приложении — системное окно выбора аккаунта (Credential Manager); веб-вход Google во встроенных окнах запрещён
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    // 8: вход через Яндекс — откроется приложение Яндекса (если есть), иначе окно входа Яндекса
    implementation("com.yandex.android:authsdk:3.1.3")
    // 11: оплата через Google Play — только в сборке для Play (Play Billing Library 8+ обязательна с 31.08.2026)
    "playImplementation"("com.android.billingclient:billing:8.3.0")
}
