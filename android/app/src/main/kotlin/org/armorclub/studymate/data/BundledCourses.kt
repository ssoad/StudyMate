package org.armorclub.studymate.data

import android.content.Context
import android.util.Log
import kotlinx.serialization.json.Json
import org.armorclub.studymate.BuildConfig
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseResource

object BundledCourses {

    const val PRODUCTION_BASE_URL = "https://studymate.armorclub.org"
    const val LOCAL_DEV_BASE_URL = "http://10.0.0.206:5173"
    const val FALLBACK_WEB_URL = "https://studymate.armorclub.org"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2Fub24iLCJpc3MiOiJzdHVkeW1hdGUtbG9jYWwiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjUwMDAwMDAwMH0.hpayDbLaCLWFAbZgM_5WOFmopfB3qqFlP-v2yhFwoTM"

    val DEFAULT_BASE_URL: String
        get() = if (BuildConfig.DEBUG) LOCAL_DEV_BASE_URL else PRODUCTION_BASE_URL

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    @Volatile
    private var cachedCourses: List<Course>? = null

    @Volatile
    private var cachedResources: List<CourseResource>? = null

    fun getBundledCourses(context: Context): List<Course> {
        cachedCourses?.let { return it }
        return synchronized(this) {
            cachedCourses?.let { return it }
            try {
                val jsonString = context.assets.open("bundled_courses.json").bufferedReader().use { it.readText() }
                val courses: List<Course> = json.decodeFromString(jsonString)
                cachedCourses = courses
                courses
            } catch (e: Exception) {
                Log.e("BundledCourses", "Failed to parse bundled_courses.json", e)
                emptyList()
            }
        }
    }

    fun getBundledResources(context: Context): List<CourseResource> {
        cachedResources?.let { return it }
        return synchronized(this) {
            cachedResources?.let { return it }
            try {
                val jsonString = context.assets.open("bundled_resources.json").bufferedReader().use { it.readText() }
                val resources: List<CourseResource> = json.decodeFromString(jsonString)
                cachedResources = resources
                resources
            } catch (e: Exception) {
                Log.e("BundledCourses", "Failed to parse bundled_resources.json", e)
                emptyList()
            }
        }
    }

    fun resolveVideoUrl(rawUrl: String?, baseUrl: String = DEFAULT_BASE_URL): String? {
        if (rawUrl == null) return null
        return if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
            rawUrl
        } else {
            val cleanBase = baseUrl.trimEnd('/')
            val cleanPath = if (rawUrl.startsWith("/")) rawUrl else "/$rawUrl"
            "$cleanBase$cleanPath"
        }
    }
}
