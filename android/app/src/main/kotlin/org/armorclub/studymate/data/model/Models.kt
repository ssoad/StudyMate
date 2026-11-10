package org.armorclub.studymate.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Course(
    val id: String,
    val title: String,
    val slug: String = "",
    val description: String = "",
    @SerialName("instructor_name") val instructorName: String = "",
    @SerialName("instructor_title") val instructorTitle: String = "",
    @SerialName("instructor_avatar") val instructorAvatar: String = "",
    @SerialName("thumbnail_url") val thumbnailUrl: String = "",
    val category: String = "Computer Science",
    val level: String = "all_levels",
    val duration: String = "",
    val rating: Double = 4.9,
    @SerialName("enrolled_count") val enrolledCount: Int = 0,
    @SerialName("is_published") val isPublished: Boolean = true,
    val sections: List<CourseSection> = emptyList(),
    val resources: List<CourseResource> = emptyList()
)

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
        get() = resourceType == "link" || fileUrl.startsWith("http://") || fileUrl.startsWith("https://") && !fileUrl.contains("/api/storage/files")

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
