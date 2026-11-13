package org.armorclub.studymate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.SearchOff
import androidx.compose.material.icons.outlined.School
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseEnrollment
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.Badge
import org.armorclub.studymate.ui.components.BadgeTone
import org.armorclub.studymate.ui.components.EmptyState
import org.armorclub.studymate.ui.components.FilterPill
import org.armorclub.studymate.ui.components.InitialsAvatar
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.SearchField
import org.armorclub.studymate.ui.components.SectionHeader
import org.armorclub.studymate.ui.components.SmCard
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing
import java.util.Calendar

private const val ALL = "All"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseListScreen(
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    enrollmentRepository: EnrollmentRepository,
    playerManager: PlayerManager,
    onCourseClick: (String) -> Unit,
    onResumeLessonClick: (courseId: String, lessonId: String) -> Unit,
    onProfileClick: () -> Unit = {},
    onOpenDrawer: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var selectedCategory by rememberSaveable { mutableStateOf(ALL) }

    val currentUser by authRepository.currentUser.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()
    val activeLesson by playerManager.activeLesson.collectAsState()
    val activeCourseId by playerManager.activeCourseId.collectAsState()

    LaunchedEffect(Unit) {
        courses = courseRepository.getCourses()
        isLoading = false
    }

    val categories = remember(courses) {
        listOf(ALL) + courses.map { it.category }.filter { it.isNotBlank() }.distinct().sorted()
    }
    val filteredCourses = remember(courses, selectedCategory, searchQuery) {
        courses.filter { course ->
            val matchesCategory = selectedCategory == ALL || course.category == selectedCategory
            val q = searchQuery.trim()
            val matchesSearch = q.isEmpty() ||
                course.title.contains(q, ignoreCase = true) ||
                course.description.contains(q, ignoreCase = true) ||
                course.sections.any { sec ->
                    sec.title.contains(q, ignoreCase = true) || sec.lessons.any { it.title.contains(q, ignoreCase = true) }
                }
            matchesCategory && matchesSearch
        }
    }
    val resumeCourse = remember(courses, activeCourseId) { courses.firstOrNull { it.id == activeCourseId } }

    Column(
        Modifier
            .fillMaxSize()
            .background(AppTheme.colors.background)
            .statusBarsPadding()
    ) {
        // Header
        Row(
            Modifier.fillMaxWidth().padding(start = Spacing.xxs, end = Spacing.gutter, top = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onOpenDrawer) {
                Icon(Icons.Outlined.Menu, contentDescription = "Open menu", tint = AppTheme.colors.textPrimary)
            }
            Column(Modifier.weight(1f)) {
                Text(greeting(), style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary)
                Text(
                    currentUser?.fullName?.substringBefore(' ')?.takeIf { it.isNotBlank() }?.let { "Hi, $it" } ?: "Explore courses",
                    style = MaterialTheme.typography.headlineMedium,
                    color = AppTheme.colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Box(Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onProfileClick)) {
                InitialsAvatar(currentUser?.fullName ?: "Guest", size = 36.dp)
            }
        }

        SearchField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = "Search courses and lessons",
            modifier = Modifier.padding(horizontal = Spacing.gutter, vertical = Spacing.sm)
        )

        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = {
                scope.launch {
                    isRefreshing = true
                    courses = courseRepository.getCourses(forceRefresh = true)
                    isRefreshing = false
                }
            },
            modifier = Modifier.fillMaxSize()
        ) {
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AppTheme.colors.primary, strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
                }
                return@PullToRefreshBox
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
            ) {
                val lesson = activeLesson
                val cId = activeCourseId
                if (lesson != null && cId != null && searchQuery.isBlank()) {
                    item(key = "resume") {
                        SmCard(modifier = Modifier.fillMaxWidth().padding(bottom = Spacing.xs)) {
                            Text("Continue", style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.textSecondary)
                            Spacer(Modifier.height(Spacing.xxs))
                            Text(
                                lesson.title,
                                style = MaterialTheme.typography.titleMedium,
                                color = AppTheme.colors.textPrimary,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (resumeCourse != null) {
                                Text(
                                    resumeCourse.title,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppTheme.colors.textSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Spacer(Modifier.height(Spacing.sm))
                            PrimaryButton("Resume", onClick = { onResumeLessonClick(cId, lesson.id) })
                        }
                    }
                }

                if (categories.size > 2) {
                    item(key = "filters") {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                            modifier = Modifier.padding(top = Spacing.xs)
                        ) {
                            items(categories, key = { it }) { cat ->
                                FilterPill(cat, selected = selectedCategory == cat, onClick = { selectedCategory = cat })
                            }
                        }
                    }
                }

                item(key = "header") {
                    SectionHeader(if (searchQuery.isBlank()) "Courses" else "Results")
                }

                if (filteredCourses.isEmpty()) {
                    item(key = "empty") {
                        if (courses.isEmpty()) {
                            EmptyState(
                                icon = Icons.Outlined.School,
                                title = "No courses yet",
                                body = "Pull down to refresh. Courses appear here once they're published."
                            )
                        } else {
                            EmptyState(
                                icon = Icons.Outlined.SearchOff,
                                title = "No matches",
                                body = "Try a different word, or clear the search.",
                                actionText = "Clear search",
                                onAction = { searchQuery = ""; selectedCategory = ALL }
                            )
                        }
                    }
                }

                items(filteredCourses, key = { it.id }) { course ->
                    val isApproved = enrollmentRepository.isCourseApproved(course.id, currentUser, course.price)
                    CourseCard(
                        course = course,
                        isApproved = isApproved,
                        enrollment = enrollments[course.id],
                        onClick = { onCourseClick(course.id) },
                        modifier = Modifier.padding(bottom = Spacing.sm)
                    )
                }
            }
        }
    }
}

@Composable
private fun CourseCard(
    course: Course,
    isApproved: Boolean,
    enrollment: CourseEnrollment?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    SmCard(modifier = modifier.fillMaxWidth(), onClick = onClick, padding = 0.dp) {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .background(AppTheme.colors.thumbnailPlaceholder)
        ) {
            if (course.thumbnailUrl.isNotBlank()) {
                AsyncImage(
                    model = course.thumbnailUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
        Column(Modifier.padding(Spacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (course.category.isNotBlank()) {
                    Text(
                        course.category,
                        style = MaterialTheme.typography.labelMedium,
                        color = AppTheme.colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Spacer(Modifier.weight(1f))
                }
                when {
                    isApproved -> Badge("Enrolled", BadgeTone.Success)
                    enrollment?.isPending == true -> Badge("Pending approval", BadgeTone.Warning)
                    else -> Text(
                        priceLabel(course),
                        style = MaterialTheme.typography.titleSmall,
                        color = AppTheme.colors.textPrimary
                    )
                }
            }
            Spacer(Modifier.height(Spacing.xxs))
            Text(
                course.title,
                style = MaterialTheme.typography.titleMedium,
                color = AppTheme.colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(Spacing.xxs))
            val lessonCount = course.sections.sumOf { it.lessons.size }
            Text(
                listOfNotNull(
                    course.instructorName.takeIf { it.isNotBlank() },
                    "$lessonCount lessons".takeIf { lessonCount > 0 },
                    course.duration.takeIf { it.isNotBlank() }
                ).joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = AppTheme.colors.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

private fun priceLabel(course: Course): String {
    val price = course.price ?: 0.0
    return if (!course.isPaidCourse || price <= 0.0) "Free" else "৳" + "%,d".format(price.toInt())
}

private fun greeting(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..11 -> "Good morning"
    in 12..16 -> "Good afternoon"
    else -> "Good evening"
}
