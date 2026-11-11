# StudyMate Production Proguard & R8 Optimization Rules

# 1. Strip debug & verbose logging in release builds for privacy & performance
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# 2. Keep Kotlinx Serialization data models
-keepattributes *Annotation*, InnerClasses, Signature
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
}
-keep,allowobfuscation,allowshrinking class org.armorclub.studymate.data.model.** { *; }
-keepclassmembers class org.armorclub.studymate.data.model.** {
    *** Companion;
}
-keepclasseswithmembers class org.armorclub.studymate.data.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# 3. Keep OkHttp & Okio internals
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# 4. Keep Media3 / ExoPlayer hardware decoder components & renderers
-keep class androidx.media3.exoplayer.** { *; }
-keep class androidx.media3.common.** { *; }
-keep class androidx.media3.ui.** { *; }
-dontwarn androidx.media3.**

# 5. Coil Image Loader
-keep class coil.** { *; }
-dontwarn coil.**

# 6. Compose Runtime & Animations
-keepclassmembers class * extends androidx.compose.runtime.Composable { *; }
-dontwarn androidx.compose.**
