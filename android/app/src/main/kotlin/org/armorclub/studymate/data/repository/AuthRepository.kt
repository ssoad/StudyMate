package org.armorclub.studymate.data.repository

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.armorclub.studymate.BuildConfig
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.AuthTokenResponse
import org.armorclub.studymate.data.model.UserProfile
import java.util.concurrent.TimeUnit

class AuthRepository(
    private val context: Context,
    private val courseRepository: CourseRepository
) {
    private val prefs = context.getSharedPreferences("studymate_auth", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private val _currentUser = MutableStateFlow<UserProfile?>(null)
    val currentUser: StateFlow<UserProfile?> = _currentUser.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    init {
        loadPersistedUser()
    }

    private fun loadPersistedUser() {
        val token = prefs.getString("access_token", null)
        val email = prefs.getString("user_email", null)
        val id = prefs.getString("user_id", null)
        val fullName = prefs.getString("user_name", "StudyMate Student") ?: "StudyMate Student"
        val role = prefs.getString("user_role", "student") ?: "student"
        val points = prefs.getInt("user_points", 120)

        // Security check: Clean any legacy demo credentials in release production builds
        if (!BuildConfig.DEBUG && (id == "demo-student-id-001" || id == "offline-demo-id" || token == "demo_token_offline" || token == "offline_demo_token" || email == "demo@studymate.org")) {
            prefs.edit().clear().apply()
            _currentUser.value = null
            _isLoggedIn.value = false
            return
        }

        if (!token.isNullOrBlank() && !email.isNullOrBlank() && !id.isNullOrBlank()) {
            val user = UserProfile(
                id = id,
                email = email,
                fullName = fullName,
                role = role,
                points = points
            )
            _currentUser.value = user
            _isLoggedIn.value = true
        } else if (BuildConfig.DEBUG) {
            // Default demo logged in user ONLY for local debug experience
            val defaultDemo = UserProfile(
                id = "demo-student-id-001",
                email = "demo@studymate.org",
                fullName = "Demo Student",
                role = "student",
                points = 150,
                bio = "Complexity IT Exam Aspirant"
            )
            _currentUser.value = defaultDemo
            _isLoggedIn.value = true
            persistUser("demo_token_offline", defaultDemo)
        } else {
            // Production Release: clean unauthenticated state
            _currentUser.value = null
            _isLoggedIn.value = false
        }
    }

    private fun persistUser(token: String, user: UserProfile) {
        prefs.edit()
            .putString("access_token", token)
            .putString("user_id", user.id)
            .putString("user_email", user.email)
            .putString("user_name", user.fullName)
            .putString("user_role", user.role)
            .putInt("user_points", user.points)
            .apply()
        _currentUser.value = user
        _isLoggedIn.value = true
    }

    suspend fun signIn(email: String, password: String): Result<UserProfile> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(cleanEmail).matches()) {
            return@withContext Result.failure(IllegalArgumentException("Please enter a valid email address."))
        }
        if (password.isBlank() || password.length < 6) {
            return@withContext Result.failure(IllegalArgumentException("Password must be at least 6 characters."))
        }

        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/auth/v1/token?grant_type=password"

            val bodyJson = buildJsonObject {
                put("email", cleanEmail)
                put("password", password)
            }.toString()

            val request = Request.Builder()
                .url(url)
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
                .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)
                .build()

            val response = httpClient.newCall(request).execute()
            val respBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                val errorMsg = try {
                    val parsed = json.decodeFromString<AuthTokenResponse>(respBody)
                    parsed.errorDescription ?: parsed.message ?: parsed.msg ?: "Invalid login credentials (code ${response.code})"
                } catch (e: Exception) {
                    "Login failed (code ${response.code})"
                }
                return@withContext Result.failure(Exception(errorMsg))
            }

            val authResp = json.decodeFromString<AuthTokenResponse>(respBody)
            val token = authResp.accessToken ?: "dummy_token"
            val userId = authResp.user?.id ?: "user_${System.currentTimeMillis()}"
            val name = authResp.user?.userMetadata?.get("full_name") ?: cleanEmail.substringBefore('@')
            val role = authResp.user?.appMetadata?.get("role") ?: "student"

            val profile = UserProfile(
                id = userId,
                email = cleanEmail,
                fullName = name,
                role = role,
                points = 120
            )

            persistUser(token, profile)
            Result.success(profile)
        } catch (e: Exception) {
            Log.e("AuthRepository", "Sign in error", e)
            Result.failure(e)
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String): Result<UserProfile> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val cleanName = fullName.trim()
        if (cleanName.isBlank()) {
            return@withContext Result.failure(IllegalArgumentException("Please enter your full name."))
        }
        if (cleanEmail.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(cleanEmail).matches()) {
            return@withContext Result.failure(IllegalArgumentException("Please enter a valid email address."))
        }
        if (password.isBlank() || password.length < 6) {
            return@withContext Result.failure(IllegalArgumentException("Password must be at least 6 characters."))
        }

        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/auth/v1/signup"

            val bodyJson = buildJsonObject {
                put("email", cleanEmail)
                put("password", password)
                putJsonObject("data") {
                    put("full_name", cleanName)
                }
            }.toString()

            val request = Request.Builder()
                .url(url)
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
                .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)
                .build()

            val response = httpClient.newCall(request).execute()
            val respBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                val errorMsg = try {
                    val parsed = json.decodeFromString<AuthTokenResponse>(respBody)
                    parsed.errorDescription ?: parsed.message ?: parsed.msg ?: "Registration failed (code ${response.code})"
                } catch (e: Exception) {
                    "Registration failed (code ${response.code})"
                }
                return@withContext Result.failure(Exception(errorMsg))
            }

            val authResp = json.decodeFromString<AuthTokenResponse>(respBody)
            val token = authResp.accessToken ?: "signup_token"
            val userId = authResp.user?.id ?: "user_${System.currentTimeMillis()}"

            val profile = UserProfile(
                id = userId,
                email = cleanEmail,
                fullName = cleanName.ifBlank { cleanEmail.substringBefore('@') },
                role = "student",
                points = 100
            )

            persistUser(token, profile)
            Result.success(profile)
        } catch (e: Exception) {
            Log.e("AuthRepository", "Sign up error", e)
            Result.failure(e)
        }
    }

    suspend fun signInAsDemo(): Result<UserProfile> {
        if (!BuildConfig.DEBUG) {
            return Result.failure(IllegalStateException("Demo sign-in is disabled in production release builds."))
        }
        val result = signIn("demo@studymate.org", "demopassword123")
        return if (result.isSuccess) {
            result
        } else {
            val offlineDemo = UserProfile(
                id = "offline-demo-id",
                email = "demo@studymate.org",
                fullName = "Demo Student",
                role = "student",
                points = 180,
                bio = "Complexity IT Exam Aspirant (Offline Mode)"
            )
            persistUser("offline_demo_token", offlineDemo)
            Result.success(offlineDemo)
        }
    }

    fun signOut() {
        prefs.edit().clear().apply()
        _currentUser.value = null
        _isLoggedIn.value = false
    }

    fun getAuthToken(): String? {
        return prefs.getString("access_token", null)
    }

    /**
     * Verifies the stored access token with the server. If the server explicitly
     * rejects it (401 — e.g. after the signing secret was rotated), the local session
     * is cleared so the user is asked to sign in again instead of silently failing to sync.
     * Network errors keep the session (offline use).
     */
    suspend fun validateSession() = withContext(Dispatchers.IO) {
        val token = getAuthToken()
        if (token.isNullOrBlank() || token == "offline_demo_token" || token == "demo_token_offline") return@withContext
        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val request = Request.Builder()
                .url("$baseUrl/auth/v1/user")
                .get()
                .addHeader("Authorization", "Bearer $token")
                .build()
            httpClient.newCall(request).execute().use { resp ->
                if (resp.code == 401) {
                    Log.i("AuthRepository", "Stored session rejected by server; signing out")
                    withContext(Dispatchers.Main) { signOut() }
                }
            }
        } catch (e: Exception) {
            Log.w("AuthRepository", "Session check skipped: ${e.message}")
        }
    }

    fun addPoints(pointsDelta: Int) {
        val current = _currentUser.value ?: return
        val newPoints = (current.points + pointsDelta).coerceAtLeast(0)
        val updated = current.copy(points = newPoints)
        _currentUser.value = updated
        prefs.edit().putInt("user_points", newPoints).apply()

        // Sync points to Supabase profiles table in background if logged in
        val token = getAuthToken()
        if (!token.isNullOrBlank() && current.id.length > 20) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
                    val url = "$baseUrl/rest/v1/profiles?id=eq.${current.id}"
                    val body = "{\"points\": $newPoints}"
                    val request = Request.Builder()
                        .url(url)
                        .patch(body.toRequestBody("application/json".toMediaType()))
                        .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                    httpClient.newCall(request).execute()
                } catch (e: Exception) {
                    Log.w("AuthRepository", "Failed to sync points remotely: ${e.message}")
                }
            }
        }
    }
}
