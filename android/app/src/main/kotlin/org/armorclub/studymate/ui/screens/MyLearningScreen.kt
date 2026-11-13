package org.armorclub.studymate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.EmptyState
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.ProgressTrack
import org.armorclub.studymate.ui.components.ScreenHeader
import org.armorclub.studymate.ui.components.SectionHeader
import org.armorclub.studymate.ui.components.SmCard
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing

private fun formatTime(millis: Long): String {
    val totalSeconds = (millis / 1000).coerceAtLeast(0)
    val h = totalSeconds / 3600
    val m = (totalSeconds % 3600) / 60
    val s = totalSeconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

private data class LearningRow(
    val course: Course,
    val done: Int,
    val total: Int,
    val resumeLesson: CourseLesson?
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyLearningScreen(
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    progressRepository: ProgressRepository,
    enrollmentRepository: EnrollmentRepository,
    playerManager: PlayerManager,
    onCourseClick: (String) -> Unit,
    onResumeLessonClick: (courseId: String, lessonId: String) -> Unit,
    onOpenDrawer: () -> Unit = {},
    onBrowseCourses: () -> Unit = {},
    onSignIn: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }

    val currentUser by authRepository.currentUser.collectAsState()
    val progressMap by progressRepository.progressMap.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()
    val activeLesson by playerManager.activeLesson.collectAsState()
    val activeCourseId by playerManager.activeCourseId.collectAsState()

    LaunchedEffect(Unit) {
        courses = courseRepository.getCourses()
        isLoading = false
    }

    val userId = progressRepository.getGuestOrUserId()
    val rows = remember(courses, progressMap, enrollments, currentUser) {
        courses
            .filter { enrollmentRepository.isCourseApproved(it.id, currentUser, it.price) }
            .map { c ->
                val lessons = c.sections.flatMap { it.lessons }
                val progress = progressRepository.getCourseProgress(userId, c.id)
                val resume = lessons.firstOrNull { it.id == progress.lastLessonId }
                    ?: lessons.firstOrNull { !progress.isCompleted(it.id) }
                    ?: lessons.firstOrNull()
                LearningRow(c, lessons.count { progress.isCompleted(it.id) }, lessons.size, resume)
            }
    }

    // "Continue" target: what's playing now, otherwise the first enrolled course's resume point.
    val continueCourse = rows.firstOrNull { it.course.id == activeCourseId } ?: rows.firstOrNull()
    val continueLesson = if (continueCourse != null && continueCourse.course.id == activeCourseId) activeLesson ?: continueCourse.resumeLesson
    else continueCourse?.resumeLesson

    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
    ) {
        ScreenHeader(
            title = "My learning",
            leading = {
                IconButton(onClick = onOpenDrawer) {
                    Icon(Icons.Outlined.Menu, contentDescription = "Open menu", tint = AppTheme.colors.textPrimary)
                }
            }
        )

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppTheme.colors.primary, strokeWidth = 2.dp)
            }

            currentUser == null -> EmptyState(
                icon = Icons.Outlined.School,
                title = "Sign in to see your courses",
                body = "Your enrolled courses and progress sync across devices once you sign in.",
                actionText = "Sign in",
                onAction = onSignIn,
                modifier = Modifier.fillMaxSize()
            )

            rows.isEmpty() -> EmptyState(
                icon = Icons.Outlined.Explore,
                title = "No courses yet",
                body = "Once an enrollment is approved, the course shows up here with your progress.",
                actionText = "Browse courses",
                onAction = onBrowseCourses,
                modifier = Modifier.fillMaxSize()
            )

            else -> PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = {
                    scope.launch {
                        isRefreshing = true
                        courses = courseRepository.getCourses(forceRefresh = true)
                        currentUser?.id?.let { enrollmentRepository.fetchRemoteEnrollments(it) }
                        isRefreshing = false
                    }
                },
                modifier = Modifier.fillMaxSize()
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
                ) {
                    if (continueCourse != null && continueLesson != null) {
                        item(key = "continue") {
                            val saved = progressRepository.getPlaybackPosition(continueCourse.course.id, continueLesson.id)
                            ContinueCard(
                                isPlaying = activeLesson != null && continueCourse.course.id == activeCourseId,
                                lessonTitle = continueLesson.title,
                                courseTitle = continueCourse.course.title,
                                resumeAt = if (saved > 2000L) formatTime(saved) else null,
                                onClick = { onResumeLessonClick(continueCourse.course.id, continueLesson.id) }
                            )
                        }
                    }

                    item(key = "courses-header") { SectionHeader("Enrolled courses") }

                    items(rows, key = { it.course.id }) { row ->
                        LearningCourseCard(
                            row = row,
                            onOpen = { onCourseClick(row.course.id) },
                            onResume = row.resumeLesson?.let { l -> { onResumeLessonClick(row.course.id, l.id) } }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ContinueCard(
    isPlaying: Boolean,
    lessonTitle: String,
    courseTitle: String,
    resumeAt: String?,
    onClick: () -> Unit
) {
    SmCard(modifier = Modifier.padding(top = Spacing.sm), onClick = onClick) {
        Text(
            if (isPlaying) "Now playing" else "Continue where you left off",
            style = MaterialTheme.typography.labelMedium,
            color = AppTheme.colors.primary
        )
        Spacer(Modifier.height(Spacing.xxs))
        Text(
            lessonTitle,
            style = MaterialTheme.typography.titleMedium,
            color = AppTheme.colors.textPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            courseTitle,
            style = MaterialTheme.typography.bodySmall,
            color = AppTheme.colors.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(Spacing.md))
        PrimaryButton(
            text = if (resumeAt != null) "Resume at $resumeAt" else "Play lesson",
            icon = Icons.Rounded.PlayArrow,
            onClick = onClick,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun LearningCourseCard(row: LearningRow, onOpen: () -> Unit, onResume: (() -> Unit)?) {
    val c = row.course
    val progress = if (row.total == 0) 0f else row.done.toFloat() / row.total
    val complete = row.total > 0 && row.done == row.total
    SmCard(modifier = Modifier.padding(bottom = Spacing.sm), onClick = onOpen, padding = 0.dp) {
        Row(Modifier.padding(Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .width(96.dp)
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(Radius.xs))
                    .background(AppTheme.colors.thumbnailPlaceholder)
            ) {
                if (c.thumbnailUrl.isNotBlank()) {
                    AsyncImage(
                        model = c.thumbnailUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
            Spacer(Modifier.width(Spacing.sm))
            Column(Modifier.weight(1f)) {
                Text(
                    c.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = AppTheme.colors.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (complete) {
                        Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = AppTheme.colors.success, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                    }
                    Text(
                        if (complete) "Completed" else "${row.done} of ${row.total} lessons · ${(progress * 100).toInt()}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (complete) AppTheme.colors.success else AppTheme.colors.textSecondary
                    )
                }
            }
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = AppTheme.colors.textMuted)
        }
        ProgressTrack(
            progress,
            modifier = Modifier.padding(start = Spacing.sm, end = Spacing.sm, bottom = Spacing.sm),
            color = if (complete) AppTheme.colors.success else AppTheme.colors.primary
        )
        if (onResume != null && !complete && row.resumeLesson != null) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onResume)
                    .background(AppTheme.colors.surfaceVariant)
                    .padding(horizontal = Spacing.sm, vertical = Spacing.xs),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Rounded.PlayArrow, contentDescription = null, tint = AppTheme.colors.primary, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(Spacing.xxs))
                Text(
                    "Next: ${row.resumeLesson.title}",
                    style = MaterialTheme.typography.bodySmall,
                    color = AppTheme.colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
