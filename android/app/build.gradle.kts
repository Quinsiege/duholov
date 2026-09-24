plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.duholov.game"
    compileSdk = 34

    defaultConfig {
        applicationId = "ru.duholov.game"
        minSdk = 24
        targetSdk = 34
        // versionCode = MainActivity.WRAPPER_VERSION; minApk в www/version.json — не выше
        versionCode = 4
        versionName = "4.1.0"
    }

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
            isMinifyEnabled = false
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
}
