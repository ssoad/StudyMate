package org.armorclub.studymate.data.repository

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import org.armorclub.studymate.BuildConfig
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.data.model.LeaderboardEntry
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

class CourseRepository(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private val client = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private var cachedCourses: List<Course>? = null
    private var cachedResources: List<CourseResource>? = null

    fun getBaseUrl(): String {
        val prefs = context.getSharedPreferences("studymate_prefs", Context.MODE_PRIVATE)
        val saved = prefs.getString("server_base_url", null)
        if (!BuildConfig.DEBUG) {
            // In release production builds, never allow fallback to local/debug development IPs
            if (saved.isNullOrBlank() || saved.contains("10.0.0.206") || saved.contains("localhost") || saved.contains("127.0.0.1")) {
                return BundledCourses.PRODUCTION_BASE_URL
            }
        }
        return saved ?: BundledCourses.DEFAULT_BASE_URL
    }

    fun setBaseUrl(url: String) {
        val prefs = context.getSharedPreferences("studymate_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("server_base_url", url.trimEnd('/')).apply()
        // Invalidate cache on URL change
        cachedCourses = null
        cachedResources = null
    }

    suspend fun getCourses(forceRefresh: Boolean = false): List<Course> = withContext(Dispatchers.IO) {
        if (!forceRefresh && cachedCourses != null) {
            return@withContext cachedCourses!!
        }

        try {
            val url = "${getBaseUrl()}/rest/v1/courses?select=*,sections:course_sections(*,resources:course_resources(*),lessons:course_lessons(*,resources:course_resources(*))),resources:course_resources(*)"
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val body = response.body?.string()
                if (!body.isNullOrBlank()) {
                    val remoteCourses: List<Course> = json.decodeFromString(body)
                    if (remoteCourses.isNotEmpty()) {
                        // Sort sections and lessons by order index
                        val sorted = remoteCourses.map { course ->
                            course.copy(
                                sections = course.sections.sortedBy { it.orderIndex }.map { section ->
                                    section.copy(lessons = section.lessons.sortedBy { it.orderIndex })
                                }
                            )
                        }
                        cachedCourses = sorted
                        return@withContext sorted
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("CourseRepository", "Failed to fetch remote courses, falling back to bundled: ${e.message}")
        }

        val fallback = BundledCourses.getBundledCourses(context)
        cachedCourses = fallback
        fallback
    }

    suspend fun getCourse(id: String): Course? = withContext(Dispatchers.IO) {
        val list = getCourses()
        list.firstOrNull { it.id == id || it.slug == id } ?: list.firstOrNull()
    }

    suspend fun getLesson(courseId: String, lessonId: String): CourseLesson? = withContext(Dispatchers.IO) {
        val course = getCourse(courseId) ?: return@withContext null
        for (section in course.sections) {
            val lesson = section.lessons.firstOrNull { it.id == lessonId }
            if (lesson != null) return@withContext lesson
        }
        course.sections.firstOrNull()?.lessons?.firstOrNull()
    }

    suspend fun getAllResources(forceRefresh: Boolean = false): List<CourseResource> = withContext(Dispatchers.IO) {
        if (!forceRefresh && cachedResources != null) {
            return@withContext cachedResources!!
        }

        try {
            val url = "${getBaseUrl()}/rest/v1/course_resources?select=*&order=created_at.desc"
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val body = response.body?.string()
                if (!body.isNullOrBlank()) {
                    val remoteResources: List<CourseResource> = json.decodeFromString(body)
                    if (remoteResources.isNotEmpty()) {
                        cachedResources = remoteResources
                        return@withContext remoteResources
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("CourseRepository", "Failed to fetch remote resources, falling back to bundled: ${e.message}")
        }

        val fallback = BundledCourses.getBundledResources(context)
        cachedResources = fallback
        fallback
    }

    fun resolveResourceUrl(fileUrl: String): String {
        return BundledCourses.resolveVideoUrl(fileUrl, getBaseUrl()) ?: fileUrl
    }

    suspend fun downloadResourceFile(fileUrl: String, destinationFile: File): Boolean = withContext(Dispatchers.IO) {
        try {
            val fullUrl = resolveResourceUrl(fileUrl)
            val request = Request.Builder().url(fullUrl).build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                response.body?.byteStream()?.use { input ->
                    FileOutputStream(destinationFile).use { output ->
                        input.copyTo(output)
                    }
                }
                return@withContext true
            }
        } catch (e: Exception) {
            Log.e("CourseRepository", "Failed to download resource from $fileUrl", e)
        }
        false
    }

    /** Top students by points. Only public profile columns are requested. */
    suspend fun getLeaderboard(limit: Int = 10): List<LeaderboardEntry> = withContext(Dispatchers.IO) {
        try {
            val url = "${getBaseUrl()}/rest/v1/profiles?select=id,full_name,points&order=points.desc&limit=$limit"
            client.newCall(Request.Builder().url(url).build()).execute().use { resp ->
                if (resp.isSuccessful) {
                    return@withContext json.decodeFromString<List<LeaderboardEntry>>(resp.body?.string().orEmpty())
                }
            }
        } catch (e: Exception) {
            Log.w("CourseRepository", "Leaderboard unavailable: ${e.message}")
        }
        emptyList()
    }
}
