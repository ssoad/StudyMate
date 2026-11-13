package org.armorclub.studymate.ui.screens

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.automirrored.rounded.NavigateBefore
import androidx.compose.material.icons.automirrored.rounded.NavigateNext
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.data.model.CourseSection
import org.armorclub.studymate.data.model.Note
import org.armorclub.studymate.data.model.UserCourseProgress
import org.armorclub.studymate.data.model.UserProfile
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.EmptyState
import org.armorclub.studymate.ui.components.EnrollmentDialog
import org.armorclub.studymate.ui.components.GhostButton
import org.armorclub.studymate.ui.components.Hairline
import org.armorclub.studymate.ui.components.MarkdownView
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.ProgressTrack
import org.armorclub.studymate.ui.components.SecondaryButton
import org.armorclub.studymate.ui.components.SmCard
import org.armorclub.studymate.ui.components.VideoPlayerView
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing
import org.armorclub.studymate.util.NotesShareHelper
import java.io.File

private enum class PlayerTab(val label: String) { Lessons("Lessons"), Files("Files"), Notes("Notes"), About("About") }

/** The video surface is always dark, independent of the app theme. */
private val VideoSurface = Color(0xFF09090B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LessonPlayerScreen(
    courseId: String,
    lessonId: String,
    courseRepository: CourseRepository,
    notesRepository: NotesRepository,
    progressRepository: ProgressRepository,
    authRepository: AuthRepository,
    enrollmentRepository: EnrollmentRepository,
    playerManager: PlayerManager,
    onBackClick: () -> Unit,
    onSelectLesson: (String) -> Unit,
    onOpenFullScreenNotes: (courseId: String, lessonId: String, lessonTitle: String, courseTitle: String) -> Unit,
    onViewResource: (title: String, fileUrl: String) -> Unit,
    onPiPClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val currentUser by authRepository.currentUser.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()
    val userId = progressRepository.getGuestOrUserId()

    val progressMap by progressRepository.progressMap.collectAsState()
    val courseProgress = progressMap[courseId] ?: progressRepository.getCourseProgress(userId, courseId)
    val isCurrentLessonDone = courseProgress.isCompleted(lessonId)

    var course by remember { mutableStateOf<Course?>(null) }
    var currentLesson by remember { mutableStateOf<CourseLesson?>(null) }
    var note by remember { mutableStateOf<Note?>(null) }
    var isFullScreen by remember { mutableStateOf(false) }
    var banner by remember { mutableStateOf<String?>(null) }
    var showEnrollmentDialog by remember { mutableStateOf(false) }

    LaunchedEffect(banner) {
        if (banner != null) {
            delay(2500)
            banner = null
        }
    }

    LaunchedEffect(courseId, lessonId) {
        val c = courseRepository.getCourse(courseId)
        course = c
        val l = courseRepository.getLesson(courseId, lessonId)
        currentLesson = l

        if (l != null && c != null) {
            val secIdx = c.sections.indexOfFirst { sec -> sec.lessons.any { it.id == l.id } }.coerceAtLeast(0)
            val lesIdx = c.sections.getOrNull(secIdx)?.lessons?.indexOfFirst { it.id == l.id }?.coerceAtLeast(0) ?: 0
            val canAccess = enrollmentRepository.canAccessLesson(courseId, secIdx, lesIdx, l, currentUser, c.price)

            if (canAccess) {
                val videoUrl = BundledCourses.resolveVideoUrl(l.videoUrl, courseRepository.getBaseUrl())
                if (videoUrl != null) {
                    val savedPos = progressRepository.getPlaybackPosition(courseId, l.id)
                    val savedDur = progressRepository.getPlaybackDuration(courseId, l.id)
                    val startPos = if (savedPos > 2000L && (savedDur == 0L || savedPos < savedDur - 5000L)) savedPos else 0L
                    playerManager.playLesson(courseId, l, videoUrl, startPositionMs = startPos)
                }
            } else {
                playerManager.pause()
            }
            note = notesRepository.getNote(l.id, c.id, l.title, c.title)
        }
    }

    val lesson = currentLesson
    val activeCourse = course
    if (lesson == null || activeCourse == null) {
        Box(
            Modifier
                .fillMaxSize()
                .background(AppTheme.colors.background),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = AppTheme.colors.primary, strokeWidth = 2.dp)
        }
        return
    }

    val allLessons = remember(activeCourse) { activeCourse.sections.flatMap { it.lessons } }
    val currentIndex = allLessons.indexOfFirst { it.id == lesson.id }
    val prevLesson = allLessons.getOrNull(currentIndex - 1)
    val nextLesson = if (currentIndex >= 0) allLessons.getOrNull(currentIndex + 1) else null

    val currentSection = activeCourse.sections.firstOrNull { sec -> sec.lessons.any { it.id == lesson.id } }
    val currentSecIdx = activeCourse.sections.indexOf(currentSection).coerceAtLeast(0)
    val currentLesIdx = currentSection?.lessons?.indexOfFirst { it.id == lesson.id }?.coerceAtLeast(0) ?: 0
    val isCourseApproved = remember(enrollments, currentUser, activeCourse) {
        enrollmentRepository.isCourseApproved(courseId, currentUser, activeCourse.price)
    }
    val canAccessCurrentLesson = enrollmentRepository.canAccessLesson(courseId, currentSecIdx, currentLesIdx, lesson, currentUser, activeCourse.price)
    val savedPlaybackPos = remember(lesson.id) { progressRepository.getPlaybackPosition(courseId, lesson.id) }

    val configuration = LocalConfiguration.current
    val isWide = configuration.screenWidthDp >= 640 && !isFullScreen

    val pagerState = rememberPagerState { PlayerTab.entries.size }

    fun requestEnroll() {
        if (currentUser == null) {
            Toast.makeText(context, "Sign in from the Account tab to enroll", Toast.LENGTH_SHORT).show()
        } else {
            showEnrollmentDialog = true
        }
    }

    fun toggleComplete(targetLessonId: String) {
        val nowDone = progressRepository.toggleLessonProgress(userId, activeCourse.id, targetLessonId)
        banner = if (nowDone) "Marked complete" else "Marked not complete"
    }

    fun openLesson(target: CourseLesson) {
        val sIdx = activeCourse.sections.indexOfFirst { s -> s.lessons.any { it.id == target.id } }.coerceAtLeast(0)
        val lIdx = activeCourse.sections.getOrNull(sIdx)?.lessons?.indexOfFirst { it.id == target.id }?.coerceAtLeast(0) ?: 0
        if (enrollmentRepository.canAccessLesson(activeCourse.id, sIdx, lIdx, target, currentUser, activeCourse.price)) {
            onSelectLesson(target.id)
        } else {
            requestEnroll()
        }
    }

    val shareLesson = {
        val text = "${lesson.title} — ${activeCourse.title}\n${BundledCourses.FALLBACK_WEB_URL}/courses/${activeCourse.id}"
        context.startActivity(
            Intent.createChooser(
                Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                },
                "Share lesson"
            )
        )
    }

    @Composable
    fun VideoArea() {
        if (!canAccessCurrentLesson) {
            LockedVideo(
                fill = isFullScreen,
                signedIn = currentUser != null,
                price = activeCourse.price,
                onBack = onBackClick,
                onEnroll = ::requestEnroll
            )
        } else {
            VideoPlayerView(
                playerManager = playerManager,
                title = lesson.title,
                courseId = courseId,
                lessonId = lessonId,
                resumePositionMs = savedPlaybackPos,
                isCompleted = isCurrentLessonDone,
                onSavePlaybackPosition = { posMs, durMs ->
                    progressRepository.savePlaybackPosition(courseId, lesson.id, posMs, durMs)
                },
                onAutoComplete = {
                    if (progressRepository.markLessonCompleted(userId, courseId, lesson.id)) {
                        banner = "Lesson complete"
                    }
                },
                onBackClick = onBackClick,
                onNextLessonClick = nextLesson?.let { nl -> { openLesson(nl) } },
                onPrevLessonClick = prevLesson?.let { pl -> { openLesson(pl) } },
                onPiPClick = onPiPClick,
                isFullScreen = isFullScreen,
                onToggleFullScreen = {
                    val activity = context as? Activity
                    if (!isFullScreen) {
                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                        isFullScreen = true
                    } else {
                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                        isFullScreen = false
                    }
                }
            )
        }
    }

    @Composable
    fun Details() {
        LessonDetails(
            lesson = lesson,
            sectionTitle = currentSection?.title,
            position = currentIndex + 1,
            total = allLessons.size,
            isDone = isCurrentLessonDone,
            canMarkDone = canAccessCurrentLesson,
            fileCount = lesson.resources.size,
            prevLesson = prevLesson,
            nextLesson = nextLesson,
            onToggleDone = { toggleComplete(lesson.id) },
            onOpenNotes = { onOpenFullScreenNotes(activeCourse.id, lesson.id, lesson.title, activeCourse.title) },
            onShowFiles = { scope.launch { pagerState.animateScrollToPage(PlayerTab.Files.ordinal) } },
            onShare = shareLesson,
            onPrev = { prevLesson?.let(::openLesson) },
            onNext = { nextLesson?.let(::openLesson) }
        )
    }

    @Composable
    fun Tabs(modifier: Modifier = Modifier) {
        Column(modifier) {
            TabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = AppTheme.colors.background,
                contentColor = AppTheme.colors.textPrimary,
                indicator = { positions ->
                    if (pagerState.currentPage < positions.size) {
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(positions[pagerState.currentPage]),
                            color = AppTheme.colors.primary,
                            height = 2.dp
                        )
                    }
                },
                divider = { HorizontalDivider(color = AppTheme.colors.divider) }
            ) {
                PlayerTab.entries.forEach { tab ->
                    val selected = pagerState.currentPage == tab.ordinal
                    Tab(
                        selected = selected,
                        onClick = { scope.launch { pagerState.animateScrollToPage(tab.ordinal) } },
                        selectedContentColor = AppTheme.colors.textPrimary,
                        unselectedContentColor = AppTheme.colors.textSecondary,
                        text = {
                            Text(
                                tab.label,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                maxLines = 1
                            )
                        }
                    )
                }
            }
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                when (PlayerTab.entries[page]) {
                    PlayerTab.Lessons -> LessonsTab(
                        course = activeCourse,
                        activeLessonId = lesson.id,
                        courseProgress = courseProgress,
                        enrollmentRepository = enrollmentRepository,
                        currentUser = currentUser,
                        onOpenLesson = ::openLesson,
                        onToggleComplete = ::toggleComplete
                    )
                    PlayerTab.Files -> FilesTab(
                        course = activeCourse,
                        section = currentSection,
                        lesson = lesson,
                        isCourseApproved = isCourseApproved,
                        courseRepository = courseRepository,
                        onViewResource = onViewResource,
                        onLocked = ::requestEnroll
                    )
                    PlayerTab.Notes -> NotesTab(
                        note = note,
                        onOpenEditor = { onOpenFullScreenNotes(activeCourse.id, lesson.id, lesson.title, activeCourse.title) },
                        onOpenOtherApps = { note?.let { n -> NotesShareHelper.openInExternalNotesApp(context, n) } },
                        onTimestampClick = { playerManager.seekTo(it) }
                    )
                    PlayerTab.About -> AboutTab(lesson = lesson, course = activeCourse)
                }
            }
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(if (isFullScreen) VideoSurface else AppTheme.colors.background)
    ) {
        if (isWide) {
            Row(
                Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
            ) {
                Column(
                    Modifier
                        .weight(0.58f)
                        .fillMaxHeight()
                        .verticalScroll(rememberScrollState())
                ) {
                    VideoArea()
                    Details()
                }
                VerticalDivider(color = AppTheme.colors.divider)
                Tabs(
                    Modifier
                        .weight(0.42f)
                        .fillMaxHeight()
                )
            }
        } else {
            Column(
                Modifier
                    .fillMaxSize()
                    .then(if (!isFullScreen) Modifier.statusBarsPadding().navigationBarsPadding() else Modifier)
            ) {
                VideoArea()
                if (!isFullScreen) {
                    Details()
                    Tabs(
                        Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = banner != null,
            enter = fadeIn() + slideInVertically { it / 2 },
            exit = fadeOut() + slideOutVertically { it / 2 },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = Spacing.lg)
        ) {
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(AppTheme.colors.textPrimary)
                    .padding(horizontal = Spacing.md, vertical = Spacing.xs),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = AppTheme.colors.background, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(Spacing.xs))
                Text(banner.orEmpty(), style = MaterialTheme.typography.labelLarge, color = AppTheme.colors.background)
            }
        }

        if (showEnrollmentDialog) {
            EnrollmentDialog(
                course = activeCourse,
                userId = currentUser?.id ?: userId,
                enrollmentRepository = enrollmentRepository,
                onDismiss = { showEnrollmentDialog = false },
                onSuccess = {
                    Toast.makeText(context, "Enrollment submitted. We'll unlock the course once it's approved.", Toast.LENGTH_LONG).show()
                }
            )
        }
    }
}

// ---------------------------------------------------------------- Video lock

@Composable
private fun LockedVideo(
    fill: Boolean,
    signedIn: Boolean,
    price: Double?,
    onBack: () -> Unit,
    onEnroll: () -> Unit
) {
    Box(
        Modifier
            .fillMaxWidth()
            .then(if (fill) Modifier.fillMaxSize() else Modifier.aspectRatio(16f / 9f))
            .background(VideoSurface)
    ) {
        IconButton(onClick = onBack, modifier = Modifier.align(Alignment.TopStart)) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
        }
        Column(
            Modifier
                .align(Alignment.Center)
                .padding(horizontal = Spacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Outlined.Lock, contentDescription = null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(Spacing.xs))
            Text("This lesson is locked", style = MaterialTheme.typography.titleSmall, color = Color.White)
            Text(
                "Enroll to watch every lesson and open the course files.",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(Spacing.sm))
            val priceText = price?.takeIf { it > 0 }?.let { " · ৳" + "%,d".format(it.toInt()) }.orEmpty()
            PrimaryButton(if (signedIn) "Enroll$priceText" else "Sign in to enroll", onClick = onEnroll)
        }
    }
}

// ---------------------------------------------------------------- Details

@Composable
private fun LessonDetails(
    lesson: CourseLesson,
    sectionTitle: String?,
    position: Int,
    total: Int,
    isDone: Boolean,
    canMarkDone: Boolean,
    fileCount: Int,
    prevLesson: CourseLesson?,
    nextLesson: CourseLesson?,
    onToggleDone: () -> Unit,
    onOpenNotes: () -> Unit,
    onShowFiles: () -> Unit,
    onShare: () -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit
) {
    var expanded by remember(lesson.id) { mutableStateOf(false) }
    val hasDescription = lesson.description.isNotBlank()

    Column(Modifier.padding(horizontal = Spacing.gutter, vertical = Spacing.sm)) {
        Text(
            lesson.title,
            style = MaterialTheme.typography.titleMedium,
            color = AppTheme.colors.textPrimary,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(2.dp))
        Text(
            listOfNotNull(sectionTitle, if (total > 0) "Lesson $position of $total" else null).joinToString(" · "),
            style = MaterialTheme.typography.bodySmall,
            color = AppTheme.colors.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (hasDescription) {
            Spacer(Modifier.height(Spacing.xs))
            Text(
                lesson.description,
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colors.textSecondary,
                maxLines = if (expanded) Int.MAX_VALUE else 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.clickable { expanded = !expanded }
            )
        }

        Spacer(Modifier.height(Spacing.sm))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            if (canMarkDone) {
                item {
                    ActionChip(
                        text = if (isDone) "Completed" else "Mark complete",
                        icon = if (isDone) Icons.Rounded.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
                        active = isDone,
                        onClick = onToggleDone
                    )
                }
            }
            item { ActionChip("Notes", Icons.Outlined.EditNote, onClick = onOpenNotes) }
            if (fileCount > 0) {
                item { ActionChip("$fileCount ${if (fileCount == 1) "file" else "files"}", Icons.Outlined.FolderOpen, onClick = onShowFiles) }
            }
            item { ActionChip("Share", Icons.Outlined.Share, onClick = onShare) }
        }

        if (prevLesson != null || nextLesson != null) {
            Spacer(Modifier.height(Spacing.xs))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                if (prevLesson != null) {
                    GhostButton("Previous", onClick = onPrev, icon = Icons.AutoMirrored.Rounded.NavigateBefore, contentColor = AppTheme.colors.textSecondary)
                } else Spacer(Modifier.width(1.dp))
                if (nextLesson != null) {
                    GhostButton("Next lesson", onClick = onNext, icon = Icons.AutoMirrored.Rounded.NavigateNext)
                }
            }
        }
    }
}

@Composable
private fun ActionChip(text: String, icon: ImageVector, active: Boolean = false, onClick: () -> Unit) {
    val c = AppTheme.colors
    val shape = RoundedCornerShape(50)
    Row(
        Modifier
            .clip(shape)
            .background(if (active) c.successContainer else c.surfaceVariant)
            .border(1.dp, if (active) c.success.copy(alpha = 0.4f) else c.cardBorder, shape)
            .clickable(onClick = onClick)
            .heightIn(min = 36.dp)
            .padding(horizontal = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = if (active) c.success else c.textSecondary, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(text, style = MaterialTheme.typography.labelMedium, color = if (active) c.success else c.textPrimary)
    }
}

// ---------------------------------------------------------------- Lessons tab

@Composable
private fun LessonsTab(
    course: Course,
    activeLessonId: String,
    courseProgress: UserCourseProgress,
    enrollmentRepository: EnrollmentRepository,
    currentUser: UserProfile?,
    onOpenLesson: (CourseLesson) -> Unit,
    onToggleComplete: (String) -> Unit
) {
    val expanded = remember { mutableStateMapOf<String, Boolean>() }
    LaunchedEffect(course.id, activeLessonId) {
        course.sections.firstOrNull { s -> s.lessons.any { it.id == activeLessonId } }?.let { expanded[it.id] = true }
    }

    val allIds = remember(course) { course.sections.flatMap { it.lessons }.map { it.id }.toSet() }
    val doneCount = courseProgress.completedLessons.count { it in allIds }
    val progress = if (allIds.isEmpty()) 0f else doneCount.toFloat() / allIds.size

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(Spacing.gutter),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        item(key = "progress") {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "$doneCount of ${allIds.size} lessons done",
                    style = MaterialTheme.typography.bodySmall,
                    color = AppTheme.colors.textSecondary,
                    modifier = Modifier.weight(1f)
                )
                Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.textPrimary)
            }
            Spacer(Modifier.height(Spacing.xxs))
            ProgressTrack(progress)
            Spacer(Modifier.height(Spacing.xs))
        }

        course.sections.forEachIndexed { sIdx, section ->
            item(key = section.id) {
                val isOpen = expanded[section.id] == true
                val rotation by animateFloatAsState(if (isOpen) 180f else 0f, label = "chevron")
                val sectionDone = section.lessons.count { courseProgress.isCompleted(it.id) }
                val hasActive = section.lessons.any { it.id == activeLessonId }
                SmCard(padding = 0.dp) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { expanded[section.id] = !isOpen }
                            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                section.title,
                                style = MaterialTheme.typography.titleSmall,
                                color = if (hasActive) AppTheme.colors.primary else AppTheme.colors.textPrimary,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                "$sectionDone of ${section.lessons.size} done",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (sectionDone == section.lessons.size && section.lessons.isNotEmpty()) AppTheme.colors.success else AppTheme.colors.textSecondary
                            )
                        }
                        Icon(Icons.Outlined.ExpandMore, contentDescription = if (isOpen) "Collapse" else "Expand", tint = AppTheme.colors.textMuted, modifier = Modifier.rotate(rotation))
                    }
                    AnimatedVisibility(isOpen) {
                        Column {
                            Hairline()
                            section.lessons.forEachIndexed { lIdx, item ->
                                PlayerLessonRow(
                                    lesson = item,
                                    isCurrent = item.id == activeLessonId,
                                    isDone = courseProgress.isCompleted(item.id),
                                    canAccess = enrollmentRepository.canAccessLesson(course.id, sIdx, lIdx, item, currentUser, course.price),
                                    onOpen = { onOpenLesson(item) },
                                    onToggleDone = { onToggleComplete(item.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlayerLessonRow(
    lesson: CourseLesson,
    isCurrent: Boolean,
    isDone: Boolean,
    canAccess: Boolean,
    onOpen: () -> Unit,
    onToggleDone: () -> Unit
) {
    val c = AppTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .background(if (isCurrent) c.primaryContainer else Color.Transparent)
            .clickable(onClick = onOpen)
            .padding(end = Spacing.md),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Leading control: toggles completion for accessible lessons.
        Box(
            Modifier
                .size(48.dp)
                .clip(CircleShape)
                .then(if (canAccess) Modifier.clickable(onClick = onToggleDone) else Modifier),
            contentAlignment = Alignment.Center
        ) {
            when {
                !canAccess -> Icon(Icons.Outlined.Lock, contentDescription = "Locked", tint = c.textMuted, modifier = Modifier.size(18.dp))
                isDone -> Icon(Icons.Rounded.CheckCircle, contentDescription = "Completed. Tap to undo", tint = c.success, modifier = Modifier.size(20.dp))
                isCurrent -> Icon(Icons.Rounded.PlayArrow, contentDescription = "Playing", tint = c.primary, modifier = Modifier.size(20.dp))
                else -> Icon(Icons.Outlined.RadioButtonUnchecked, contentDescription = "Mark complete", tint = c.textMuted, modifier = Modifier.size(20.dp))
            }
        }
        Column(Modifier.weight(1f).padding(vertical = Spacing.xs)) {
            Text(
                lesson.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal,
                color = when {
                    isCurrent -> c.textPrimary
                    !canAccess -> c.textSecondary
                    else -> c.textPrimary
                },
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            val meta = listOfNotNull(
                lesson.formattedDuration.takeIf { lesson.durationSeconds > 0 },
                lesson.resources.size.takeIf { it > 0 }?.let { "$it ${if (it == 1) "file" else "files"}" }
            ).joinToString(" · ")
            if (meta.isNotEmpty()) {
                Text(meta, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
            }
        }
    }
}

// ---------------------------------------------------------------- Files tab

@Composable
private fun FilesTab(
    course: Course,
    section: CourseSection?,
    lesson: CourseLesson,
    isCourseApproved: Boolean,
    courseRepository: CourseRepository,
    onViewResource: (title: String, fileUrl: String) -> Unit,
    onLocked: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val lessonFiles = (lesson.resources + course.resources.filter { it.lessonId == lesson.id }).distinctBy { it.id }
    val sectionFiles = section?.let { sec ->
        (sec.resources + course.resources.filter { it.sectionId == sec.id && it.lessonId == null }).distinctBy { it.id }
    }.orEmpty().filter { r -> lessonFiles.none { it.id == r.id } }
    val courseFiles = course.resources
        .filter { it.sectionId == null && it.lessonId == null }
        .filter { r -> lessonFiles.none { it.id == r.id } && sectionFiles.none { it.id == r.id } }

    // A preview lesson's own files are readable even before enrolling.
    fun locked(isLessonFile: Boolean) = !isCourseApproved && !(isLessonFile && lesson.isPreview)

    fun open(res: CourseResource, isLessonFile: Boolean) {
        when {
            locked(isLessonFile) -> onLocked()
            res.isLink -> runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(res.fileUrl))) }
                .onFailure { Toast.makeText(context, "No app can open this link", Toast.LENGTH_SHORT).show() }
            else -> onViewResource(res.title, res.fileUrl)
        }
    }

    fun download(res: CourseResource) {
        scope.launch {
            Toast.makeText(context, "Downloading ${res.title}", Toast.LENGTH_SHORT).show()
            val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
            val ok = courseRepository.downloadResourceFile(res.fileUrl, dest)
            Toast.makeText(context, if (ok) "Saved ${dest.name}" else "Download failed. Try again.", Toast.LENGTH_SHORT).show()
        }
    }

    if (lessonFiles.isEmpty() && sectionFiles.isEmpty() && courseFiles.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.FolderOpen,
            title = "No files for this lesson",
            body = "All course notes are in the Resources tab."
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = Spacing.xs)
    ) {
        listOf(
            Triple("This lesson", lessonFiles, true),
            Triple(section?.title ?: "This module", sectionFiles, false),
            Triple("Course files", courseFiles, false)
        ).forEach { (title, files, isLessonFile) ->
            if (files.isNotEmpty()) {
                item(key = "h-$title") {
                    Text(
                        title,
                        style = MaterialTheme.typography.labelMedium,
                        color = AppTheme.colors.textMuted,
                        modifier = Modifier.padding(start = Spacing.gutter, end = Spacing.gutter, top = Spacing.sm, bottom = Spacing.xxs)
                    )
                }
                items(files, key = { "$title-${it.id}" }) { res ->
                    val isLocked = locked(isLessonFile)
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 56.dp)
                            .clickable { open(res, isLessonFile) }
                            .padding(start = Spacing.gutter, end = Spacing.xxs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(Radius.xs))
                                .background(AppTheme.colors.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(res.fileFormatBadge, style = MaterialTheme.typography.labelSmall, color = AppTheme.colors.textSecondary)
                        }
                        Spacer(Modifier.width(Spacing.sm))
                        Column(Modifier.weight(1f)) {
                            Text(
                                res.title,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isLocked) AppTheme.colors.textSecondary else AppTheme.colors.textPrimary,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (res.fileSize.isNotBlank()) {
                                Text(res.fileSize, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textMuted)
                            }
                        }
                        when {
                            isLocked -> Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                                Icon(Icons.Outlined.Lock, contentDescription = "Locked", tint = AppTheme.colors.textMuted, modifier = Modifier.size(18.dp))
                            }
                            res.isLink -> Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                                Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null, tint = AppTheme.colors.textSecondary, modifier = Modifier.size(18.dp))
                            }
                            else -> IconButton(onClick = { download(res) }) {
                                Icon(Icons.Outlined.Download, contentDescription = "Download ${res.title}", tint = AppTheme.colors.textSecondary, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- Notes tab

@Composable
private fun NotesTab(
    note: Note?,
    onOpenEditor: () -> Unit,
    onOpenOtherApps: () -> Unit,
    onTimestampClick: (Long) -> Unit
) {
    val hasContent = note?.content?.isNotBlank() == true
    Column(
        Modifier
            .fillMaxSize()
            .padding(Spacing.gutter)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            PrimaryButton(if (hasContent) "Edit notes" else "Write notes", onClick = onOpenEditor, icon = Icons.Outlined.EditNote)
            if (hasContent) {
                SecondaryButton("Open in…", onClick = onOpenOtherApps, icon = Icons.AutoMirrored.Outlined.OpenInNew)
            }
        }
        Spacer(Modifier.height(Spacing.sm))
        if (hasContent) {
            SmCard(modifier = Modifier.weight(1f)) {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    MarkdownView(markdown = note!!.content, onTimestampClick = onTimestampClick)
                }
            }
        } else {
            Text(
                "Notes you write here are saved per lesson. Add timestamps to jump back to a moment in the video.",
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colors.textSecondary
            )
        }
    }
}

// ---------------------------------------------------------------- About tab

@Composable
private fun AboutTab(lesson: CourseLesson, course: Course) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.gutter)
    ) {
        Text("About this lesson", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
        Spacer(Modifier.height(Spacing.xxs))
        Text(
            lesson.description.ifBlank { "No description for this lesson yet." },
            style = MaterialTheme.typography.bodyMedium,
            color = AppTheme.colors.textSecondary
        )
        Spacer(Modifier.height(Spacing.lg))
        Text("Course", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
        Spacer(Modifier.height(Spacing.xxs))
        Text(course.title, style = MaterialTheme.typography.bodyMedium, color = AppTheme.colors.textSecondary)
        if (course.instructorName.isNotBlank()) {
            Spacer(Modifier.height(Spacing.lg))
            Text("Instructor", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
            Spacer(Modifier.height(Spacing.xxs))
            Text(
                listOf(course.instructorName, course.instructorTitle).filter { it.isNotBlank() }.joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colors.textSecondary
            )
        }
    }
}
