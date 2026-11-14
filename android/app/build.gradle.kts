import java.util.Properties

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.compose.compiler)
  alias(libs.plugins.kotlin.serialization)
}

android {
  namespace = "org.armorclub.studymate"
  compileSdk = 36
  defaultConfig {
    applicationId = "org.armorclub.studymate"
    minSdk = 26
    targetSdk = 36
    versionCode = 3
    versionName = "1.1.1"
  }

  // Release signing comes from android/keystore.properties (gitignored),
  // created by scripts/create-release-key.sh.
  val keystoreProps = rootProject.file("keystore.properties")
  val releaseSigning = if (keystoreProps.exists()) {
    val p = Properties().apply { keystoreProps.inputStream().use { load(it) } }
    signingConfigs.create("release") {
      storeFile = file(p.getProperty("storeFile"))
      storePassword = p.getProperty("storePassword")
      keyAlias = p.getProperty("keyAlias")
      keyPassword = p.getProperty("keyPassword")
    }
  } else null

  buildTypes {
    release {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      // Falls back to the debug key only so local release builds still work;
      // public APKs must be built with keystore.properties present.
      signingConfig = releaseSigning ?: signingConfigs.getByName("debug")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  buildFeatures {
    compose = true
    aidl = false
    buildConfig = true
    shaders = false
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }
}

kotlin {
  jvmToolchain(17)
}

dependencies {
  val composeBom = platform(libs.androidx.compose.bom)
  implementation(composeBom)
  androidTestImplementation(composeBom)

  // Core Android dependencies
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.activity.compose)

  // Arch Components & Navigation
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.viewmodel.compose)
  implementation(libs.androidx.navigation.compose)

  // Compose UI & Material 3
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.material.icons.extended)

  // Tooling
  debugImplementation(libs.androidx.compose.ui.tooling)
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  debugImplementation(libs.androidx.compose.ui.test.manifest)

  // Local tests
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)

  // Media3 (ExoPlayer for ultra-optimized hardware-accelerated playback)
  implementation(libs.media3.exoplayer)
  implementation(libs.media3.ui)
  implementation(libs.media3.session)
  implementation(libs.media3.datasource)

  // Networking, JSON serialization & Image loading
  implementation(libs.okhttp)
  implementation(libs.kotlinx.serialization.json)
  implementation(libs.coil.compose)
}
