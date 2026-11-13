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
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.UserCourseProgress
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class ProgressRepository(
    private val context: Context,
    private val courseRepository: CourseRepository,
    private val authRepository: AuthRepository
) {
    companion object {
        const val POINTS_PER_LESSON = 15
    }

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }
    private val prefs = context.getSharedPreferences("studymate_progress", Context.MODE_PRIVATE)
    private val playbackPrefs = context.getSharedPreferences("studymate_playback", Context.MODE_PRIVATE)

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    private val scope = CoroutineScope(Dispatchers.IO)

    // Reactive cache: courseId -> UserCourseProgress
    private val _progressMap = MutableStateFlow<Map<String, UserCourseProgress>>(emptyMap())
    val progressMap: StateFlow<Map<String, UserCourseProgress>> = _progressMap.asStateFlow()

    init {
        loadAllCachedProgress()
    }

    fun getGuestOrUserId(): String {
        val user = authRepository.currentUser.value
        if (user != null && user.id.isNotBlank()) return user.id
        val guestKey = "anonymous_guest_id"
        var guestId = prefs.getString(guestKey, null)
        if (guestId.isNullOrBlank()) {
            guestId = "guest_" + java.util.UUID.randomUUID().toString().replace("-", "").take(12)
            prefs.edit().putString(guestKey, guestId).apply()
        }
        return guestId
    }

    private fun getProgressStorageKey(userId: String, courseId: String): String {
        return "progress_${userId}_$courseId"
    }

    private fun loadAllCachedProgress() {
        val allEntries = prefs.all
        val map = mutableMapOf<String, UserCourseProgress>()
        for ((key, value) in allEntries) {
            if (key.startsWith("progress_") && value is String) {
                try {
                    val progress: UserCourseProgress = json.decodeFromString(value)
                    map[progress.courseId] = progress
                } catch (e: Exception) {
                    Log.w("ProgressRepository", "Error deserializing cached progress for $key: ${e.message}")
                }
            }
        }
        _progressMap.value = map
    }

    fun getCourseProgress(userId: String, courseId: String): UserCourseProgress {
        // 1. Check in-memory map
        _progressMap.value[courseId]?.let { return it }

        // 2. Check SharedPreferences
        val key = getProgressStorageKey(userId, courseId)
        val raw = prefs.getString(key, null)
        if (!raw.isNullOrBlank()) {
            try {
                val progress: UserCourseProgress = json.decodeFromString(raw)
                val updated = _progressMap.value.toMutableMap()
                updated[courseId] = progress
                _progressMap.value = updated
                return progress
            } catch (e: Exception) {
                Log.w("ProgressRepository", "Failed to parse local progress for $courseId", e)
            }
        }

        // 3. Fallback default
        val defaultProgress = UserCourseProgress(
            userId = userId,
            courseId = courseId,
            completedLessons = emptyList()
        )
        return defaultProgress
    }

    fun isLessonCompleted(userId: String, courseId: String, lessonId: String): Boolean {
        val progress = getCourseProgress(userId, courseId)
        return progress.isCompleted(lessonId)
    }

    fun toggleLessonProgress(userId: String, courseId: String, lessonId: String): Boolean {
        val current = getCourseProgress(userId, courseId)
        val isDone = current.completedLessons.contains(lessonId)
        val updatedLessons = if (isDone) {
            current.completedLessons.filter { it != lessonId }
        } else {
            current.completedLessons + lessonId
        }

        val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date())
        val updated = current.copy(
            userId = userId,
            courseId = courseId,
            completedLessons = updatedLessons,
            lastLessonId = lessonId,
            updatedAt = isoDate
        )

        // Save locally
        saveLocalProgress(userId, courseId, updated)

        // Update in-memory reactive flow
        val map = _progressMap.value.toMutableMap()
        map[courseId] = updated
        _progressMap.value = map

        // Award points the first time a lesson is completed (not on every re-toggle).
        if (!isDone) {
            val awardKey = "points_awarded_${userId}"
            val awarded = prefs.getStringSet(awardKey, emptySet()).orEmpty()
            val lessonKey = "$courseId/$lessonId"
            if (lessonKey !in awarded) {
                prefs.edit().putStringSet(awardKey, awarded + lessonKey).apply()
                authRepository.addPoints(POINTS_PER_LESSON)
            }
        }

        // Sync to Supabase in background
        syncProgressRemotely(updated)

        return !isDone
    }

    fun markLessonCompleted(userId: String, courseId: String, lessonId: String): Boolean {
        val current = getCourseProgress(userId, courseId)
        if (current.completedLessons.contains(lessonId)) {
            return false // already completed
        }
        return toggleLessonProgress(userId, courseId, lessonId)
    }

    private fun saveLocalProgress(userId: String, courseId: String, progress: UserCourseProgress) {
        val key = getProgressStorageKey(userId, courseId)
        val raw = json.encodeToString(progress)
        prefs.edit().putString(key, raw).apply()
    }

    // Video Playback Position Tracking
    fun savePlaybackPosition(courseId: String, lessonId: String, positionMs: Long, durationMs: Long) {
        if (lessonId.isBlank() || positionMs < 0) return
        playbackPrefs.edit()
            .putLong("${courseId}_${lessonId}_pos", positionMs)
            .putLong("${courseId}_${lessonId}_dur", durationMs)
            .putLong("${courseId}_${lessonId}_time", System.currentTimeMillis())
            .apply()

        // Also update last_lesson_id in course progress
        val userId = getGuestOrUserId()
        val current = getCourseProgress(userId, courseId)
        if (current.lastLessonId != lessonId) {
            val updated = current.copy(lastLessonId = lessonId)
            saveLocalProgress(userId, courseId, updated)
            val map = _progressMap.value.toMutableMap()
            map[courseId] = updated
            _progressMap.value = map
        }
    }

    fun getPlaybackPosition(courseId: String, lessonId: String): Long {
        return playbackPrefs.getLong("${courseId}_${lessonId}_pos", 0L)
    }

    fun getPlaybackDuration(courseId: String, lessonId: String): Long {
        return playbackPrefs.getLong("${courseId}_${lessonId}_dur", 0L)
    }

    fun checkAutoCompletion(courseId: String, lessonId: String, positionMs: Long, durationMs: Long): Boolean {
        if (durationMs > 15_000L && positionMs >= (durationMs * 0.90f)) {
            val userId = getGuestOrUserId()
            if (!isLessonCompleted(userId, courseId, lessonId)) {
                markLessonCompleted(userId, courseId, lessonId)
                return true
            }
        }
        return false
    }

    fun getCourseProgressPercentage(userId: String, course: Course): Int {
        val progress = getCourseProgress(userId, course.id)
        val allLessonIds = course.sections.flatMap { it.lessons }.map { it.id }.toSet()
        val totalCount = allLessonIds.size
        if (totalCount == 0) return 0
        val completedCount = progress.completedLessons.count { allLessonIds.contains(it) }
        return Math.min(100, Math.round((completedCount.toFloat() / totalCount) * 100))
    }

    fun getCompletedCount(userId: String, course: Course): Int {
        val progress = getCourseProgress(userId, course.id)
        val allLessonIds = course.sections.flatMap { it.lessons }.map { it.id }.toSet()
        return progress.completedLessons.count { allLessonIds.contains(it) }
    }

    fun getSectionCompletedCount(userId: String, courseId: String, lessonIds: List<String>): Int {
        val progress = getCourseProgress(userId, courseId)
        return lessonIds.count { progress.isCompleted(it) }
    }

    private fun syncProgressRemotely(progress: UserCourseProgress) {
        val token = authRepository.getAuthToken()
        if (token.isNullOrBlank() || progress.userId.length < 20) return

        scope.launch {
            try {
                val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
                val url = "$baseUrl/rest/v1/course_user_progress"

                val bodyObj = buildJsonObject {
                    put("user_id", progress.userId)
                    put("course_id", progress.courseId)
                    put("completed_lessons", buildJsonArray {
                        progress.completedLessons.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) }
                    })
                    if (!progress.lastLessonId.isNullOrBlank()) {
                        put("last_lesson_id", progress.lastLessonId)
                    }
                    if (!progress.updatedAt.isNullOrBlank()) {
                        put("updated_at", progress.updatedAt)
                    }
                }

                val request = Request.Builder()
                    .url(url)
                    .post(bodyObj.toString().toRequestBody("application/json".toMediaType()))
                    .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("Prefer", "resolution=merge-duplicates")
                    .build()

                val resp = httpClient.newCall(request).execute()
                if (!resp.isSuccessful) {
                    Log.w("ProgressRepository", "Remote progress sync returned code ${resp.code}")
                }
            } catch (e: Exception) {
                Log.w("ProgressRepository", "Failed to sync progress to Supabase: ${e.message}")
            }
        }
    }

    suspend fun fetchRemoteProgress(userId: String, courseId: String): UserCourseProgress? = withContext(Dispatchers.IO) {
        val token = authRepository.getAuthToken()
        if (token.isNullOrBlank() || userId.length < 20) return@withContext null

        try {
            val baseUrl = courseRepository.getBaseUrl().trimEnd('/')
            val url = "$baseUrl/rest/v1/course_user_progress?user_id=eq.$userId&course_id=eq.$courseId&select=*"
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", BundledCourses.SUPABASE_ANON_KEY)
                .addHeader("Authorization", "Bearer $token")
                .build()

            val resp = httpClient.newCall(request).execute()
            if (resp.isSuccessful) {
                val body = resp.body?.string()
                if (!body.isNullOrBlank()) {
                    val list: List<UserCourseProgress> = json.decodeFromString(body)
                    if (list.isNotEmpty()) {
                        val remote = list.first()
                        val current = getCourseProgress(userId, courseId)
                        // Merge completed lessons
                        val mergedCompleted = (current.completedLessons + remote.completedLessons).distinct()
                        val merged = remote.copy(completedLessons = mergedCompleted)
                        saveLocalProgress(userId, courseId, merged)
                        val map = _progressMap.value.toMutableMap()
                        map[courseId] = merged
                        _progressMap.value = map
                        return@withContext merged
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("ProgressRepository", "Failed to fetch remote progress: ${e.message}")
        }
        null
    }
}
