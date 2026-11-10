package org.armorclub.studymate.data.repository

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.model.CourseResource
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
        return prefs.getString("server_base_url", BundledCourses.DEFAULT_BASE_URL) ?: BundledCourses.DEFAULT_BASE_URL
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
        list.firstOrNull { it.id == id }
    }

    suspend fun getLesson(courseId: String, lessonId: String): CourseLesson? = withContext(Dispatchers.IO) {
        val course = getCourse(courseId) ?: return@withContext null
        for (section in course.sections) {
            val lesson = section.lessons.firstOrNull { it.id == lessonId }
            if (lesson != null) return@withContext lesson
        }
        null
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
}
