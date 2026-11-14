package org.armorclub.studymate.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

@Serializable
data class Course(
    val id: String,
    val title: String,
    val slug: String = "",
    val description: String = "",
    @SerialName("instructor_name") val instructorName: String = "Complexity IT Team",
    @SerialName("instructor_title") val instructorTitle: String = "ICT & BCS Technical Specialists",
    @SerialName("instructor_avatar") val instructorAvatar: String = "",
    @SerialName("thumbnail_url") val thumbnailUrl: String = "",
    val category: String = "Computer Science & ICT",
    val level: String = "All Levels",
    val duration: String = "66 Hours",
    val rating: Double = 4.95,
    @SerialName("enrolled_count") val enrolledCount: Int = 341,
    @SerialName("is_published") val isPublished: Boolean = true,
    val price: Double? = 2500.0,
    val currency: String = "BDT",
    @SerialName("payment_instructions") val paymentInstructions: String? = null,
    val sections: List<CourseSection> = emptyList(),
    val resources: List<CourseResource> = emptyList()
) {
    val isPaidCourse: Boolean
        get() = (price ?: 0.0) > 0.0

    val formattedPrice: String
        get() = if (isPaidCourse) "৳${price?.toInt() ?: 2500}" else "Free"

    val totalLessonsCount: Int
        get() = sections.sumOf { it.lessons.size }

    val totalResourcesCount: Int
        get() = resources.size + sections.sumOf { it.resources.size + it.lessons.sumOf { l -> l.resources.size } }
}

@Serializable
data class CourseSection(
    val id: String,
    @SerialName("course_id") val courseId: String = "",
    val title: String,
    @SerialName("order_index") val orderIndex: Int = 0,
    val lessons: List<CourseLesson> = emptyList(),
    val resources: List<CourseResource> = emptyList()
)

@Serializable
data class CourseLesson(
    val id: String,
    @SerialName("section_id") val sectionId: String = "",
    @SerialName("course_id") val courseId: String = "",
    val title: String,
    val description: String = "",
    @SerialName("video_url") val videoUrl: String? = null,
    @SerialName("youtube_video_id") val youtubeVideoId: String? = null,
    @SerialName("youtube_video_url") val youtubeVideoUrl: String? = null,
    @SerialName("duration_seconds") val durationSeconds: Int = 2400,
    @SerialName("order_index") val orderIndex: Int = 0,
    @SerialName("is_preview") val isPreview: Boolean = false,
    val transcript: String? = null,
    val resources: List<CourseResource> = emptyList()
) {
    val formattedDuration: String
        get() {
            val hours = durationSeconds / 3600
            val minutes = (durationSeconds % 3600) / 60
            val seconds = durationSeconds % 60
            return if (hours > 0) {
                String.format("%d:%02d:%02d", hours, minutes, seconds)
            } else {
                String.format("%02d:%02d", minutes, seconds)
            }
        }
}

@Serializable
data class CourseResource(
    val id: String,
    @SerialName("course_id") val courseId: String = "",
    @SerialName("section_id") val sectionId: String? = null,
    @SerialName("lesson_id") val lessonId: String? = null,
    val title: String,
    val description: String = "",
    @SerialName("resource_type") val resourceType: String = "document",
    @SerialName("file_url") val fileUrl: String = "",
    @SerialName("file_size") val fileSize: String = "",
    @SerialName("created_at") val createdAt: String? = null
) {
    val isPdf: Boolean
        get() = resourceType == "pdf" || fileUrl.endsWith(".pdf", ignoreCase = true) || title.endsWith(".pdf", ignoreCase = true)

    val isImage: Boolean
        get() = fileUrl.endsWith(".png", ignoreCase = true) || fileUrl.endsWith(".jpg", ignoreCase = true) || fileUrl.endsWith(".jpeg", ignoreCase = true) || resourceType == "image"

    val isLink: Boolean
        get() = resourceType == "link" ||
            ((fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) && !fileUrl.contains("/api/storage/files"))

    val fileFormatBadge: String
        get() = when {
            isPdf -> "PDF"
            isImage -> "IMG"
            isLink -> "LINK"
            else -> "DOC"
        }

    val displayFileName: String
        get() {
            val fromUrl = fileUrl.substringAfterLast('/').substringBefore('?')
            return if (fromUrl.isNotBlank() && fromUrl != fileUrl) fromUrl else title
        }
}

@Serializable
data class StudyResource(
    val id: String,
    val title: String,
    val description: String = "",
    val type: String = "file", // file | link
    val url: String = "",
    @SerialName("uploader_id") val uploaderId: String? = null,
    val status: String = "approved",
    @SerialName("created_at") val createdAt: String? = null
) {
    val isPdf: Boolean
        get() = type == "file" && (url.endsWith(".pdf", ignoreCase = true) || title.endsWith(".pdf", ignoreCase = true))

    val isImage: Boolean
        get() = url.endsWith(".png", ignoreCase = true) || url.endsWith(".jpg", ignoreCase = true) || url.endsWith(".jpeg", ignoreCase = true)

    val fileFormatBadge: String
        get() = when {
            isPdf -> "PDF"
            isImage -> "IMG"
            type == "link" -> "LINK"
            else -> "DOC"
        }

    val displayFileName: String
        get() {
            val fromUrl = url.substringAfterLast('/').substringBefore('?')
            return if (fromUrl.isNotBlank() && fromUrl != url) fromUrl else title
        }
}

@Serializable
data class Note(
    val id: String,
    val lessonId: String,
    val courseId: String,
    val lessonTitle: String,
    val courseTitle: String,
    val content: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class UserProfile(
    val id: String,
    val email: String,
    @SerialName("full_name") val fullName: String = "StudyMate Student",
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val role: String = "student",
    val points: Int = 120,
    val bio: String? = "Preparing for Assistant Director (ICT) Exam"
)

@Serializable
data class AuthTokenResponse(
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("token_type") val tokenType: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    val user: AuthUserData? = null,
    val error: String? = null,
    @SerialName("error_description") val errorDescription: String? = null,
    val message: String? = null,
    val msg: String? = null
)

/** The signed-in user's row from /rest/v1/profiles (only the fields the app reads). */
@Serializable
data class ProfileRow(
    @SerialName("full_name") val fullName: String? = null,
    val points: Int? = null
)

@Serializable
data class AuthUserData(
    val id: String,
    val email: String,
    // Metadata can hold arrays and nested objects (e.g. "providers": ["email"]),
    // so keep it as raw JSON and read single string fields on demand.
    @SerialName("user_metadata") val userMetadata: JsonObject? = null,
    @SerialName("app_metadata") val appMetadata: JsonObject? = null
) {
    fun userMeta(key: String): String? = (userMetadata?.get(key) as? JsonPrimitive)?.contentOrNull
    fun appMeta(key: String): String? = (appMetadata?.get(key) as? JsonPrimitive)?.contentOrNull
}

@Serializable
data class UserCourseProgress(
    @SerialName("user_id") val userId: String = "",
    @SerialName("course_id") val courseId: String = "",
    @SerialName("completed_lessons") val completedLessons: List<String> = emptyList(),
    @SerialName("last_lesson_id") val lastLessonId: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    fun isCompleted(lessonId: String): Boolean = completedLessons.contains(lessonId)
}

@Serializable
data class CourseEnrollment(
    val id: String = "",
    @SerialName("course_id") val courseId: String = "",
    @SerialName("user_id") val userId: String = "",
    val status: String = "pending", // pending | approved | rejected
    @SerialName("payment_method") val paymentMethod: String = "bKash",
    @SerialName("transaction_id") val transactionId: String = "",
    @SerialName("sender_number") val senderNumber: String = "",
    val amount: Double = 2500.0,
    @SerialName("proof_url") val proofUrl: String? = null,
    @SerialName("student_notes") val studentNotes: String? = null,
    @SerialName("admin_notes") val adminNotes: String? = null,
    @SerialName("approved_at") val approvedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val isApproved: Boolean get() = status.equals("approved", ignoreCase = true)
    val isPending: Boolean get() = status.equals("pending", ignoreCase = true)
    val isRejected: Boolean get() = status.equals("rejected", ignoreCase = true)
}

@Serializable
data class LeaderboardEntry(
    val id: String,
    @kotlinx.serialization.SerialName("full_name") val fullName: String? = null,
    val points: Int = 0
)
