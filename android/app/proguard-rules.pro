# 15: правила R8 для приложения-обёртки «Духолов».
# Мост для игры в WebView: методы с @JavascriptInterface вызываются из JavaScript по имени — не переименовывать и не удалять.
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# Вход через Google (Credential Manager): реализацию Play Services находит по имени класса
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
# Вход через Яндекс (LoginSDK) — осторожно: сохраняем целиком
-keep class com.yandex.authsdk.** { *; }
-dontwarn com.yandex.authsdk.**
# Play Billing (сборка play)
-keep class com.android.billingclient.api.** { *; }
# Номера строк в отчётах о сбоях (Play Console) — остаются, имя исходника скрыто
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
