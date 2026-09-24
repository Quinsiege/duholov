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
        versionCode = 3
        versionName = "3.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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
