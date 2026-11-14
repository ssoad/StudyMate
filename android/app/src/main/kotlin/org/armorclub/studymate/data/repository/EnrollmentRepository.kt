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
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseEnrollment
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.model.UserProfile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class EnrollmentRepository(
    private val context: Context,
    private val courseRepository: CourseRepository,
    private val authRepository: AuthRepository
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }
    private val prefs = context.getSharedPreferences("studymate_enrollments", Context.MODE_PRIVATE)

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val scope = CoroutineScope(Dispatchers.IO)

    // Reactive cache: courseId -> CourseEnrollment
    private val _enrollments = MutableStateFlow<Map<String, CourseEnrollment>>(emptyMap())
    val enrollments: StateFlow<Map<String, CourseEnrollment>> = _enrollments.asStateFlow()

    init {
        loadCachedEnrollments()

        // Automatically fetch enrollments whenever active user changes
        scope.launch {
            authRepository.currentUser.collect { user ->
                if (user != null && user.id.isNotBlank()) {
                    fetchRemoteEnrollments(user.id)
                } else {
                    // When logged out, clear non-local or keep offline state
                    loadCachedEnrollments()
                }
            }
        }
    }

    private fun loadCachedEnrollments() {
        val allEntries = prefs.all
        val map = mutableMapOf<String, CourseEnrollment>()
        for ((key, value) in allEntries) {
            if (key.startsWith("enrollment_") && value is String) {
                try {
                    val enrollment: CourseEnrollment = json.decodeFromString(value)
                    map[enrollment.courseId] = enrollment
                } catch (e: Exception) {
                    Log.w("EnrollmentRepository", "Error deserializing enrollment for $key", e)
                }
            }
        }
        _enrollments.value = map
    }

    fun getEnrollment(courseId: String): CourseEnrollment? {
        return _enrollments.value[courseId]
    }

    /**
     * Determines whether the current user has approved, active access to a course.
     * Web Parity: Admins always have access, free courses are open, paid courses require approved enrollment.
     */
    fun isCourseApproved(courseId: String, user: UserProfile?, coursePrice: Double? = 2500.0): Boolean {
        if (user != null) {
            val isAdmin = user.role.equals("admin", ignoreCase = true) ||
                    user.email.equals("admin@studymate.org", ignoreCase = true) ||
                    user.email.equals("admin@studymate.local", ignoreCase = true)
            if (isAdmin) return true
        }

        // If free course, anyone logged in or guest can access
        if (coursePrice == null || coursePrice <= 0.0) {
            return true
        }

        // Paid course requires approved enrollment
        val enrollment = getEnrollment(courseId)
        return enrollment != null && enrollment.isApproved
    }

    /**
     * Checks if a specific lecture is accessible (either through approved course access or free preview).
     */
    fun canAccessLesson(
        courseId: String,
        sectionIndex: Int,
        lessonIndex: Int,
        lesson: CourseLesson,
        user: UserProfile?,
        coursePrice: Double? = 2500.0
    ): Boolean {
        if (isCourseApproved(courseId, user, coursePrice)) return true
        // Free preview rules: first lesson of the course OR lesson explicitly flagged is_preview
        return lesson.isPreview || (sectionIndex == 0 && lessonIndex == 0)
    }

    /**
     * Checks if course notes or documents can be read/downloaded.
     */
    fun canAccessResource(
        courseId: String,
        lesson: CourseLesson?,
        user: UserProfile?,
        coursePrice: Double? = 2500.0
    ): Boolean {
        if (isCourseApproved(courseId, user, coursePrice)) return true
        if (lesson != null && lesson.isPreview) return true
        return false
    }

    /**
     * Active payment methods for a course: the course's own methods if it has any,
     * otherwise the ones that apply to all courses. Empty when none are configured or offline.
     */
    suspend fun paymentMethodsFor(courseId: String): List<org.armorclub.studymate.data.model.PaymentMethodRow> = withContext(Dispatchers.IO) {
        try {
            val base = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$base/rest/v1/payment_methods?select=id,course_id,label,kind,account_type,account_name,account_number,instructions,sort_order" +
                "&is_active=eq.true&or=(course_id.is.null,course_id.eq.$courseId)&order=sort_order.asc"
            val request = Request.Builder().url(url).get()
                .addHeader("apikey", org.armorclub.studymate.data.BundledCourses.SUPABASE_ANON_KEY)
                .build()
            httpClient.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) return@withContext emptyList()
                val rows = json.decodeFromString<List<org.armorclub.studymate.data.model.PaymentMethodRow>>(resp.body?.string().orEmpty())
                val specific = rows.filter { it.courseId == courseId }
                if (specific.isNotEmpty()) specific else rows.filter { it.courseId == null }
            }
        } catch (e: Exception) {
            Log.w("EnrollmentRepository", "Payment methods unavailable: ${e.message}")
            emptyList()
        }
    }

    suspend fun fetchRemoteEnrollments(userId: String) = withContext(Dispatchers.IO) {
        if (userId.isBlank()) return@withContext

        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/rest/v1/course_enrollments?user_id=eq.$userId&select=*"
            val token = authRepository.getAuthToken()

            val reqBuilder = Request.Builder()
                .url(url)
                .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)

            if (!token.isNullOrBlank()) {
                reqBuilder.addHeader("Authorization", "Bearer $token")
            }

            val resp = httpClient.newCall(reqBuilder.build()).execute()
            if (resp.isSuccessful) {
                val body = resp.body?.string()
                if (!body.isNullOrBlank()) {
                    val list: List<CourseEnrollment> = json.decodeFromString(body)
                    val map = _enrollments.value.toMutableMap()
                    val editor = prefs.edit()
                    for (item in list) {
                        map[item.courseId] = item
                        editor.putString("enrollment_${item.courseId}", json.encodeToString(item))
                    }
                    editor.apply()
                    _enrollments.value = map
                }
            }
        } catch (e: Exception) {
            Log.w("EnrollmentRepository", "Failed to fetch remote enrollments: ${e.message}")
        }
    }

    suspend fun submitEnrollment(
        courseId: String,
        userId: String,
        paymentMethod: String,
        senderNumber: String,
        transactionId: String,
        amount: Double,
        studentNotes: String = ""
    ): Result<CourseEnrollment> = withContext(Dispatchers.IO) {
        if (senderNumber.isBlank()) {
            return@withContext Result.failure(IllegalArgumentException("Please enter your sender phone number."))
        }
        if (transactionId.isBlank() || transactionId.length < 4) {
            return@withContext Result.failure(IllegalArgumentException("Please enter a valid Transaction ID (TrxID)."))
        }

        val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date())
        val localEnrollment = CourseEnrollment(
            id = java.util.UUID.randomUUID().toString(),
            courseId = courseId,
            userId = userId,
            status = "pending",
            paymentMethod = paymentMethod,
            transactionId = transactionId.trim().uppercase(),
            senderNumber = senderNumber.trim(),
            amount = amount,
            studentNotes = studentNotes.trim().ifBlank { null },
            createdAt = isoDate,
            updatedAt = isoDate
        )

        // 1. Save locally immediately
        prefs.edit().putString("enrollment_$courseId", json.encodeToString(localEnrollment)).apply()
        val map = _enrollments.value.toMutableMap()
        map[courseId] = localEnrollment
        _enrollments.value = map

        // 2. Submit to backend
        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/rest/v1/course_enrollments"
            val token = authRepository.getAuthToken()

            val bodyJson = buildJsonObject {
                put("id", localEnrollment.id)
                put("course_id", courseId)
                put("user_id", userId)
                put("status", "pending")
                put("payment_method", paymentMethod)
                put("transaction_id", localEnrollment.transactionId)
                put("sender_number", localEnrollment.senderNumber)
                put("amount", amount)
                if (localEnrollment.studentNotes != null) {
                    put("student_notes", localEnrollment.studentNotes)
                }
                put("updated_at", isoDate)
            }.toString()

            val reqBuilder = Request.Builder()
                .url(url)
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
                .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)
                .addHeader("Prefer", "resolution=merge-duplicates")

            if (!token.isNullOrBlank()) {
                reqBuilder.addHeader("Authorization", "Bearer $token")
            }

            val resp = httpClient.newCall(reqBuilder.build()).execute()
            if (!resp.isSuccessful) {
                Log.w("EnrollmentRepository", "Remote enrollment submit returned code ${resp.code}")
            }
        } catch (e: Exception) {
            Log.w("EnrollmentRepository", "Failed to submit enrollment remotely, saved locally: ${e.message}")
        }

        Result.success(localEnrollment)
    }
}
