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
        } else {
            // Default demo logged in user for immediate seamless experience
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
        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/auth/v1/token?grant_type=password"

            val bodyJson = buildJsonObject {
                put("email", email.trim().lowercase())
                put("password", password)
            }.toString()

            val request = Request.Builder()
                .url(url)
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
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
            val name = authResp.user?.userMetadata?.get("full_name") ?: email.substringBefore('@')
            val role = authResp.user?.appMetadata?.get("role") ?: "student"

            val profile = UserProfile(
                id = userId,
                email = email,
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
        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/auth/v1/signup"

            val bodyJson = buildJsonObject {
                put("email", email.trim().lowercase())
                put("password", password)
                putJsonObject("data") {
                    put("full_name", fullName.trim())
                }
            }.toString()

            val request = Request.Builder()
                .url(url)
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
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
                email = email,
                fullName = fullName.ifBlank { email.substringBefore('@') },
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
}
