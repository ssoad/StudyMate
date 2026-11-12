package org.armorclub.studymate.ui.screens

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CheckCircleOutline
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.ui.draw.rotate
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.NoteAlt
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.VerticalDivider
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.data.model.CourseSection
import org.armorclub.studymate.data.model.Note
import org.armorclub.studymate.data.model.UserCourseProgress
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.EnrollmentDialog
import org.armorclub.studymate.ui.components.LectureVideoCard
import org.armorclub.studymate.ui.components.MarkdownView
import org.armorclub.studymate.ui.components.UdemyResourceCard
import org.armorclub.studymate.ui.components.VideoPlayerView
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.util.NotesShareHelper
import java.io.File

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
    val userId = progressRepository.getGuestOrUserId()

    val progressMap by progressRepository.progressMap.collectAsState()
    val courseProgress = progressMap[courseId] ?: progressRepository.getCourseProgress(userId, courseId)
    val isCurrentLessonDone = courseProgress.isCompleted(lessonId)

    var course by remember { mutableStateOf<Course?>(null) }
    var currentLesson by remember { mutableStateOf<CourseLesson?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Syllabus, 1: Resources, 2: Notes, 3: Overview
    var note by remember { mutableStateOf<Note?>(null) }
    var isFullScreen by remember { mutableStateOf(false) }

    var completionToastMessage by remember { mutableStateOf<String?>(null) }
    var showEnrollmentDialog by remember { mutableStateOf(false) }

    LaunchedEffect(completionToastMessage) {
        if (completionToastMessage != null) {
            delay(3000)
            completionToastMessage = null
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

    if (currentLesson == null || course == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val lesson = currentLesson!!
    val activeCourse = course!!

    // Flatten all lessons for next/previous navigation
    val allLessons = activeCourse.sections.flatMap { it.lessons }
    val currentIndex = allLessons.indexOfFirst { it.id == lesson.id }
    val prevLesson = if (currentIndex > 0) allLessons[currentIndex - 1] else null
    val nextLesson = if (currentIndex in 0 until allLessons.size - 1) allLessons[currentIndex + 1] else null

    // Locate current section
    val currentSection = activeCourse.sections.firstOrNull { sec -> sec.lessons.any { it.id == lesson.id } }
    val currentSecIdx = activeCourse.sections.indexOfFirst { sec -> sec.lessons.any { it.id == lesson.id } }.coerceAtLeast(0)
    val currentLesIdx = currentSection?.lessons?.indexOfFirst { it.id == lesson.id }?.coerceAtLeast(0) ?: 0
    val isCourseApproved = enrollmentRepository.isCourseApproved(courseId, currentUser, activeCourse.price)
    val canAccessCurrentLesson = enrollmentRepository.canAccessLesson(courseId, currentSecIdx, currentLesIdx, lesson, currentUser, activeCourse.price)

    @Composable
    fun LockedLectureBarrier(modifier: Modifier = Modifier) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .then(if (isFullScreen) Modifier.fillMaxSize() else Modifier.aspectRatio(16f / 9f))
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF0F172A), Color(0xFF020617))
                    )
                )
                .padding(16.dp)
        ) {
            IconButton(
                onClick = onBackClick,
                modifier = Modifier.align(Alignment.TopStart)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.Center)
                    .padding(horizontal = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF59E0B).copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = null,
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(26.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Premium Lecture Locked",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "This lecture is part of the full curriculum. Enroll in the course to unlock on-demand HD videos & study materials.",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 15.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = { showEnrollmentDialog = true },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AppTheme.colors.primaryButton,
                        contentColor = AppTheme.colors.onPrimaryButton
                    ),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    modifier = Modifier.height(38.dp)
                ) {
                    Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (currentUser != null) "Enroll Now (৳${activeCourse.price?.toInt() ?: 2500}) 🎓" else "Enroll Now (Sign In) 🎓",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }

    val savedPlaybackPos = remember(lesson.id) { progressRepository.getPlaybackPosition(courseId, lesson.id) }

    val configuration = LocalConfiguration.current
    val isTabletOrLandscape = configuration.screenWidthDp >= 640 && !isFullScreen

    val pagerState = rememberPagerState(initialPage = selectedTab) { 4 }

    LaunchedEffect(selectedTab) {
        if (pagerState.currentPage != selectedTab) {
            pagerState.animateScrollToPage(selectedTab)
        }
    }
    LaunchedEffect(pagerState.currentPage) {
        selectedTab = pagerState.currentPage
    }

    var isLiked by remember { mutableStateOf(false) }
    var isDescriptionExpanded by remember { mutableStateOf(false) }

    @Composable
    fun VideoDetailsSection() {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            // Video Title with expandable description chevron
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isDescriptionExpanded = !isDescriptionExpanded },
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = lesson.title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.colors.textPrimary
                    ),
                    maxLines = if (isDescriptionExpanded) 4 else 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = Icons.Default.KeyboardArrowDown,
                    contentDescription = "Expand description",
                    tint = AppTheme.colors.textSecondary,
                    modifier = Modifier
                        .size(20.dp)
                        .rotate(if (isDescriptionExpanded) 180f else 0f)
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Stats row
            Text(
                text = "${activeCourse.enrolledCount} enrolled • ${activeCourse.duration} • ${currentSection?.title?.substringBefore(':') ?: "Module"}",
                color = AppTheme.colors.textSecondary,
                fontSize = 11.sp
            )

            AnimatedVisibility(visible = isDescriptionExpanded) {
                Column(modifier = Modifier.padding(top = 8.dp)) {
                    Text(
                        text = lesson.description.ifBlank { activeCourse.description },
                        color = AppTheme.colors.textSecondary,
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // YouTube-style Action Pills Row
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                // Complete Check Action Pill (Matching Web App & Coursera/Udemy standard)
                item {
                    Surface(
                        color = if (isCurrentLessonDone) Color(0xFF059669).copy(alpha = 0.25f) else AppTheme.colors.surfaceVariant,
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(
                            1.dp,
                            if (isCurrentLessonDone) Color(0xFF10B981) else AppTheme.colors.cardBorder
                        ),
                        modifier = Modifier.clickable {
                            val nowDone = progressRepository.toggleLessonProgress(userId, courseId, lesson.id)
                            completionToastMessage = if (nowDone) "Lesson marked as completed! (+15 Points) ✓" else "Lesson marked as incomplete"
                        }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (isCurrentLessonDone) Icons.Default.CheckCircle else Icons.Default.CheckCircleOutline,
                                contentDescription = "Complete Status",
                                tint = if (isCurrentLessonDone) Color(0xFF10B981) else AppTheme.colors.textSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isCurrentLessonDone) "Completed ✓" else "Mark Complete",
                                color = if (isCurrentLessonDone) Color(0xFF10B981) else AppTheme.colors.textPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                item {
                    Surface(
                        color = if (isLiked) AppTheme.colors.primary.copy(alpha = 0.25f) else AppTheme.colors.surfaceVariant,
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                        modifier = Modifier.clickable { isLiked = !isLiked }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.ThumbUp,
                                contentDescription = "Helpful",
                                tint = if (isLiked) AppTheme.colors.primary else AppTheme.colors.textSecondary,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isLiked) "342" else "341",
                                color = if (isLiked) AppTheme.colors.primary else AppTheme.colors.textPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                item {
                    Surface(
                        color = AppTheme.colors.surfaceVariant,
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                        modifier = Modifier.clickable {
                            val shareText = "Watching ${lesson.title} on StudyMate: ${activeCourse.title}"
                            val sendIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, shareText)
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(sendIntent, "Share Lecture"))
                        }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Share, contentDescription = "Share", tint = AppTheme.colors.textSecondary, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Share", color = AppTheme.colors.textPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                item {
                    Surface(
                        color = AppTheme.colors.surfaceVariant,
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                        modifier = Modifier.clickable { selectedTab = 1 }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.PictureAsPdf, contentDescription = "Notes", tint = Color(0xFFF472B6), modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("${lesson.resources.size} Notes", color = AppTheme.colors.textPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                item {
                    Surface(
                        color = AppTheme.colors.surfaceVariant,
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                        modifier = Modifier.clickable {
                            onOpenFullScreenNotes(activeCourse.id, lesson.id, lesson.title, activeCourse.title)
                        }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.NoteAlt, contentDescription = "Write Notes", tint = AppTheme.colors.primary, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Full Notes", color = AppTheme.colors.textPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = AppTheme.colors.cardBorder)
            Spacer(modifier = Modifier.height(10.dp))

            // YouTube Channel / Instructor Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF6366F1), Color(0xFF0284C7))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = activeCourse.instructorName.take(2).uppercase(),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Text(
                            text = activeCourse.instructorName,
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Lead ICT Mentors • ${activeCourse.enrolledCount} enrolled",
                            color = AppTheme.colors.textSecondary,
                            fontSize = 10.sp
                        )
                    }
                }

                Surface(
                    color = AppTheme.colors.primary.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = AppTheme.colors.primary, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Enrolled", color = AppTheme.colors.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    @Composable
    fun TabsSection(modifier: Modifier = Modifier) {
        Column(modifier = modifier) {
            // Responsive Scrollable Tab Header with real-time badges & animated indicator
            ScrollableTabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = AppTheme.colors.background,
                contentColor = AppTheme.colors.primary,
                edgePadding = 12.dp,
                indicator = { tabPositions ->
                    if (pagerState.currentPage < tabPositions.size) {
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[pagerState.currentPage]),
                            color = AppTheme.colors.primary,
                            height = 3.dp
                        )
                    }
                },
                divider = {
                    HorizontalDivider(color = AppTheme.colors.cardBorder)
                }
            ) {
                // Tab 0: Syllabus
                Tab(
                    selected = pagerState.currentPage == 0,
                    onClick = { scope.launch { pagerState.animateScrollToPage(0) } },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.AutoMirrored.Filled.List,
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                tint = if (pagerState.currentPage == 0) AppTheme.colors.primary else AppTheme.colors.textSecondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Syllabus",
                                fontSize = 12.sp,
                                fontWeight = if (pagerState.currentPage == 0) FontWeight.Bold else FontWeight.SemiBold,
                                color = if (pagerState.currentPage == 0) AppTheme.colors.textPrimary else AppTheme.colors.textSecondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                color = if (pagerState.currentPage == 0) AppTheme.colors.primary.copy(alpha = 0.2f) else AppTheme.colors.surfaceVariant,
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text(
                                    text = "${allLessons.size}",
                                    color = if (pagerState.currentPage == 0) AppTheme.colors.primary else AppTheme.colors.textSecondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                )

                // Tab 1: Resources
                Tab(
                    selected = pagerState.currentPage == 1,
                    onClick = { scope.launch { pagerState.animateScrollToPage(1) } },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Folder,
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                tint = if (pagerState.currentPage == 1) AppTheme.colors.primary else AppTheme.colors.textSecondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Resources",
                                fontSize = 12.sp,
                                fontWeight = if (pagerState.currentPage == 1) FontWeight.Bold else FontWeight.SemiBold,
                                color = if (pagerState.currentPage == 1) AppTheme.colors.textPrimary else AppTheme.colors.textSecondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                color = if (pagerState.currentPage == 1) AppTheme.colors.primary.copy(alpha = 0.2f) else AppTheme.colors.surfaceVariant,
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text(
                                    text = "${lesson.resources.size}",
                                    color = if (pagerState.currentPage == 1) AppTheme.colors.primary else AppTheme.colors.textSecondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                )

                // Tab 2: Notes
                Tab(
                    selected = pagerState.currentPage == 2,
                    onClick = { scope.launch { pagerState.animateScrollToPage(2) } },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.NoteAlt,
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                tint = if (pagerState.currentPage == 2) AppTheme.colors.primary else AppTheme.colors.textSecondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Notes",
                                fontSize = 12.sp,
                                fontWeight = if (pagerState.currentPage == 2) FontWeight.Bold else FontWeight.SemiBold,
                                color = if (pagerState.currentPage == 2) AppTheme.colors.textPrimary else AppTheme.colors.textSecondary
                            )
                        }
                    }
                )

                // Tab 3: Overview
                Tab(
                    selected = pagerState.currentPage == 3,
                    onClick = { scope.launch { pagerState.animateScrollToPage(3) } },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Description,
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                tint = if (pagerState.currentPage == 3) AppTheme.colors.primary else AppTheme.colors.textSecondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Overview",
                                fontSize = 12.sp,
                                fontWeight = if (pagerState.currentPage == 3) FontWeight.Bold else FontWeight.SemiBold,
                                color = if (pagerState.currentPage == 3) AppTheme.colors.textPrimary else AppTheme.colors.textSecondary
                            )
                        }
                    }
                )
            }

            // Swipeable HorizontalPager Tab Content
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                when (page) {
                    0 -> SyllabusTab(
                        course = activeCourse,
                        activeLessonId = lesson.id,
                        courseProgress = courseProgress,
                        enrollmentRepository = enrollmentRepository,
                        currentUser = currentUser,
                        onSelectLesson = { newLessonId -> onSelectLesson(newLessonId) },
                        onLockedLessonClick = {
                            showEnrollmentDialog = true
                        },
                        onToggleLessonComplete = { targetLessonId ->
                            val nowDone = progressRepository.toggleLessonProgress(userId, activeCourse.id, targetLessonId)
                            completionToastMessage = if (nowDone) "Lesson marked as completed! (+15 Points) ✓" else "Lesson marked as incomplete"
                        }
                    )
                    1 -> LessonResourcesTab(
                        course = activeCourse,
                        section = currentSection,
                        lesson = lesson,
                        isCourseApproved = isCourseApproved,
                        courseRepository = courseRepository,
                        onViewResource = onViewResource,
                        onLockedClick = {
                            showEnrollmentDialog = true
                        }
                    )
                    2 -> NotesTab(
                        note = note,
                        onOpenFullScreen = {
                            onOpenFullScreenNotes(activeCourse.id, lesson.id, lesson.title, activeCourse.title)
                        },
                        onOpenOtherApps = {
                            note?.let { n -> NotesShareHelper.openInExternalNotesApp(context, n) }
                        },
                        onTimestampClick = { seekPosMs -> playerManager.seekTo(seekPosMs) }
                    )
                    3 -> OverviewTab(lesson = lesson, course = activeCourse)
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (isTabletOrLandscape) {
            // Responsive 2-Pane Tablet / Landscape Split Layout
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .background(MaterialTheme.colorScheme.background)
            ) {
                // Left Pane: Video Player + Details (56% width)
                Column(
                    modifier = Modifier
                        .weight(0.56f)
                        .fillMaxHeight()
                        .verticalScroll(rememberScrollState())
                ) {
                    if (!canAccessCurrentLesson) {
                        LockedLectureBarrier()
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
                                val wasNew = progressRepository.markLessonCompleted(userId, courseId, lesson.id)
                                if (wasNew) {
                                    completionToastMessage = "Lesson marked as completed! (+15 Points) ✓"
                                }
                            },
                            onBackClick = onBackClick,
                            onNextLessonClick = nextLesson?.let { nl -> { onSelectLesson(nl.id) } },
                            onPrevLessonClick = prevLesson?.let { pl -> { onSelectLesson(pl.id) } },
                            onPiPClick = onPiPClick,
                            isFullScreen = false,
                            onToggleFullScreen = {
                                val activity = context as? Activity
                                activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                                isFullScreen = true
                            }
                        )
                    }
                    VideoDetailsSection()
                }

                VerticalDivider(color = AppTheme.colors.cardBorder, thickness = 1.dp)

                // Right Pane: Full-Height Swipeable Tab Layout (44% width)
                TabsSection(
                    modifier = Modifier
                        .weight(0.44f)
                        .fillMaxHeight()
                )
            }
        } else {
            // Standard Phone Portrait Stack Layout
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .then(if (!isFullScreen) Modifier.statusBarsPadding().navigationBarsPadding() else Modifier)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                if (!canAccessCurrentLesson) {
                    LockedLectureBarrier()
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
                            val wasNew = progressRepository.markLessonCompleted(userId, courseId, lesson.id)
                            if (wasNew) {
                                completionToastMessage = "Lesson marked as completed! (+15 Points) ✓"
                            }
                        },
                        onBackClick = onBackClick,
                        onNextLessonClick = nextLesson?.let { nl -> { onSelectLesson(nl.id) } },
                        onPrevLessonClick = prevLesson?.let { pl -> { onSelectLesson(pl.id) } },
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

                if (!isFullScreen) {
                    VideoDetailsSection()
                    HorizontalDivider(color = AppTheme.colors.cardBorder)
                    TabsSection(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    )
                }
            }
        }

        // Animated Completion Toast Banner (Matching Web App "+15 Points" alert)
        AnimatedVisibility(
            visible = completionToastMessage != null,
            enter = fadeIn() + androidx.compose.animation.slideInVertically { it / 2 },
            exit = fadeOut() + androidx.compose.animation.slideOutVertically { it / 2 },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp)
        ) {
            Surface(
                color = Color(0xFF064E3B),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, Color(0xFF10B981)),
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF34D399),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = completionToastMessage ?: "",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        if (showEnrollmentDialog) {
            EnrollmentDialog(
                course = activeCourse,
                userId = userId,
                enrollmentRepository = enrollmentRepository,
                onDismiss = { showEnrollmentDialog = false },
                onSuccess = {
                    Toast.makeText(context, "Enrollment submitted! Verification pending.", Toast.LENGTH_LONG).show()
                }
            )
        }
    }
}

@Composable
private fun LessonResourcesTab(
    course: Course,
    section: CourseSection?,
    lesson: CourseLesson,
    isCourseApproved: Boolean,
    courseRepository: CourseRepository,
    onViewResource: (title: String, fileUrl: String) -> Unit,
    onLockedClick: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // 1. Direct lesson materials
    val lessonResources = (lesson.resources + course.resources.filter { it.lessonId == lesson.id }).distinctBy { it.id }

    // 2. Current Section materials (not specific to another lesson)
    val sectionResources = section?.let { sec ->
        (sec.resources + course.resources.filter { it.sectionId == sec.id && it.lessonId == null }).distinctBy { it.id }
    } ?: emptyList()

    // 3. Course-level handbooks
    val courseLevelResources = course.resources.filter { it.sectionId == null && it.lessonId == null }

    val allTabResources = (lessonResources + sectionResources + courseLevelResources).distinctBy { it.id }

    if (allTabResources.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.Folder,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "No attached materials for this lecture.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Browse the main Learning Library in the Resources tab for all course notes & books.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    fontSize = 11.sp
                )
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (lessonResources.isNotEmpty()) {
            item {
                Text(
                    text = "Lecture Materials (${lessonResources.size})",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                )
            }
            items(lessonResources, key = { "l_" + it.id }) { res ->
                UdemyResourceCard(
                    resource = res,
                    moduleName = "LECTURE RESOURCE",
                    isLocked = !isCourseApproved,
                    onRead = { onViewResource(res.title, res.fileUrl) },
                    onDownload = {
                        scope.launch {
                            Toast.makeText(context, "Downloading ${res.title}...", Toast.LENGTH_SHORT).show()
                            val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
                            courseRepository.downloadResourceFile(res.fileUrl, dest)
                            Toast.makeText(context, "Saved to ${dest.name}", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onOpenExternal = {
                        val fullUrl = courseRepository.resolveResourceUrl(res.fileUrl)
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl)))
                    },
                    onLockedClick = onLockedClick
                )
            }
        }

        if (sectionResources.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${section?.title ?: "Module"} Section Materials (${sectionResources.size})",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF10B981)
                    )
                )
            }
            items(sectionResources, key = { "s_" + it.id }) { res ->
                UdemyResourceCard(
                    resource = res,
                    moduleName = "MODULE RESOURCE",
                    isLocked = !isCourseApproved,
                    onRead = { onViewResource(res.title, res.fileUrl) },
                    onDownload = {
                        scope.launch {
                            Toast.makeText(context, "Downloading ${res.title}...", Toast.LENGTH_SHORT).show()
                            val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
                            courseRepository.downloadResourceFile(res.fileUrl, dest)
                            Toast.makeText(context, "Saved to ${dest.name}", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onOpenExternal = {
                        val fullUrl = courseRepository.resolveResourceUrl(res.fileUrl)
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl)))
                    },
                    onLockedClick = onLockedClick
                )
            }
        }

        if (courseLevelResources.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Course Handbooks & Guides (${courseLevelResources.size})",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                )
            }
            items(courseLevelResources, key = { "c_" + it.id }) { res ->
                UdemyResourceCard(
                    resource = res,
                    moduleName = "HANDBOOK",
                    isLocked = !isCourseApproved,
                    onRead = { onViewResource(res.title, res.fileUrl) },
                    onDownload = {
                        scope.launch {
                            val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
                            courseRepository.downloadResourceFile(res.fileUrl, dest)
                            Toast.makeText(context, "Saved to ${dest.name}", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onOpenExternal = {
                        val fullUrl = courseRepository.resolveResourceUrl(res.fileUrl)
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl)))
                    },
                    onLockedClick = onLockedClick
                )
            }
        }
    }
}

@Composable
private fun LessonResourceItem(
    resource: CourseResource,
    onView: () -> Unit,
    onDownload: () -> Unit,
    onOpenExternal: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onView() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (resource.isPdf) Color(0xFFEF4444).copy(alpha = 0.15f)
                            else Color(0xFF3B82F6).copy(alpha = 0.15f)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (resource.isPdf) Icons.Default.PictureAsPdf else Icons.Default.Image,
                        contentDescription = null,
                        tint = if (resource.isPdf) Color(0xFFEF4444) else Color(0xFF3B82F6),
                        modifier = Modifier.size(18.dp)
                    )
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column {
                    Text(
                        text = resource.title,
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (resource.fileSize.isNotBlank()) {
                            Text(
                                text = resource.fileSize,
                                style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "•",
                                style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                        }
                        Text(
                            text = if (resource.isPdf) "PDF Document" else "Handout",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Button(
                    onClick = onView,
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Read", fontSize = 11.sp)
                }
                IconButton(onClick = onOpenExternal) {
                    Icon(
                        Icons.AutoMirrored.Filled.OpenInNew,
                        contentDescription = "Open in App",
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun OverviewTab(lesson: CourseLesson, course: Course) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = lesson.title,
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "${course.title} • Duration: ${lesson.formattedDuration}",
            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "Lecture Description",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = lesson.description.ifBlank { "Full comprehensive lecture including theory, whiteboard derivations, and hands-on code walkthrough." },
                    style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 20.sp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Instructor",
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "${course.instructorName} — ${course.instructorTitle}",
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun NotesTab(
    note: Note?,
    onOpenFullScreen: () -> Unit,
    onOpenOtherApps: () -> Unit,
    onTimestampClick: (Long) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Full screen & external app action cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = onOpenFullScreen,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Fullscreen, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Full Screen Notes", maxLines = 1)
            }

            OutlinedButton(
                onClick = onOpenOtherApps,
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Open in App", maxLines = 1)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // In-line notes preview card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(14.dp)
            ) {
                if (note != null) {
                    MarkdownView(
                        markdown = note.content,
                        onTimestampClick = onTimestampClick
                    )
                } else {
                    Text("No notes yet. Tap 'Full Screen Notes' to begin writing!")
                }
            }
        }
    }
}

@Composable
private fun SyllabusTab(
    course: Course,
    activeLessonId: String,
    courseProgress: UserCourseProgress,
    enrollmentRepository: EnrollmentRepository,
    currentUser: org.armorclub.studymate.data.model.UserProfile?,
    onSelectLesson: (String) -> Unit,
    onLockedLessonClick: (CourseLesson) -> Unit,
    onToggleLessonComplete: (String) -> Unit
) {
    // Accordion expansion state: maps section.id -> Boolean
    val expandedSections = remember { mutableStateMapOf<String, Boolean>() }

    // By default, expand the section that contains the currently active lesson
    LaunchedEffect(course.id, activeLessonId) {
        course.sections.forEach { section ->
            if (section.lessons.any { it.id == activeLessonId }) {
                expandedSections[section.id] = true
            } else if (!expandedSections.containsKey(section.id)) {
                expandedSections[section.id] = false
            }
        }
    }

    fun expandAll() {
        course.sections.forEach { section ->
            expandedSections[section.id] = true
        }
    }

    fun collapseAll() {
        course.sections.forEach { section ->
            expandedSections[section.id] = false
        }
    }

    val allLessonIds = course.sections.flatMap { it.lessons }.map { it.id }.toSet()
    val totalLectures = allLessonIds.size
    val completedCount = courseProgress.completedLessons.count { allLessonIds.contains(it) }
    val progressPercent = if (totalLectures > 0) Math.min(100, Math.round((completedCount.toFloat() / totalLectures) * 100)) else 0

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Controls Row: Course curriculum summary, Progress Bar, & Expand/Collapse All
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                border = BorderStroke(1.dp, AppTheme.colors.cardBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Course Curriculum",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = AppTheme.colors.textPrimary
                                )
                            )
                            Text(
                                text = "${course.sections.size} Modules • $totalLectures Lectures",
                                color = AppTheme.colors.textSecondary,
                                fontSize = 11.sp
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(
                                onClick = { expandAll() },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colors.primary),
                                border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Expand All", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { collapseAll() },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colors.textSecondary),
                                border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Collapse", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Progress Bar & Percentage (Matching Web App)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "$completedCount of $totalLectures completed",
                            color = Color(0xFF10B981),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "$progressPercent%",
                            color = AppTheme.colors.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    LinearProgressIndicator(
                        progress = { progressPercent / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = Color(0xFF10B981),
                        trackColor = AppTheme.colors.surfaceVariant
                    )
                }
            }
        }

        // Accordion Section Modules
        items(course.sections.size) { sIdx ->
            val section = course.sections[sIdx]
            val isExpanded = expandedSections[section.id] ?: false
            val arrowRotation by animateFloatAsState(
                targetValue = if (isExpanded) 180f else 0f,
                label = "syllabus_accordion_arrow"
            )
            val hasActiveLesson = section.lessons.any { it.id == activeLessonId }
            val sectionCompletedCount = section.lessons.count { courseProgress.isCompleted(it.id) }
            val isSectionFullyDone = sectionCompletedCount == section.lessons.size && section.lessons.isNotEmpty()

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (hasActiveLesson) AppTheme.colors.cardBackground else AppTheme.colors.surfaceVariant
                ),
                border = BorderStroke(
                    1.dp,
                    if (hasActiveLesson) AppTheme.colors.primary.copy(alpha = 0.6f) else AppTheme.colors.cardBorder
                )
            ) {
                Column {
                    // Clickable Accordion Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                expandedSections[section.id] = !isExpanded
                            }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (isSectionFullyDone) Color(0xFF059669)
                                        else if (hasActiveLesson) AppTheme.colors.primary
                                        else AppTheme.colors.cardBorder
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isSectionFullyDone) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                } else {
                                    Text(
                                        text = "${sIdx + 1}",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(10.dp))

                            Column {
                                Text(
                                    text = section.title,
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (hasActiveLesson) AppTheme.colors.primary else AppTheme.colors.textPrimary
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${section.lessons.size} lectures • $sectionCompletedCount/${section.lessons.size} completed",
                                    fontSize = 10.sp,
                                    color = if (isSectionFullyDone) Color(0xFF10B981) else AppTheme.colors.textSecondary
                                )
                            }
                        }

                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = if (isExpanded) "Collapse" else "Expand",
                            tint = if (isExpanded) AppTheme.colors.primary else AppTheme.colors.textMuted,
                            modifier = Modifier
                                .size(20.dp)
                                .rotate(arrowRotation)
                        )
                    }

                    // Expandable Lecture List
                    AnimatedVisibility(
                        visible = isExpanded,
                        enter = expandVertically() + fadeIn(),
                        exit = shrinkVertically() + fadeOut()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(AppTheme.colors.background)
                        ) {
                            HorizontalDivider(color = AppTheme.colors.cardBorder)

                            section.lessons.forEachIndexed { lIdx, itemLesson ->
                                val isCurrent = itemLesson.id == activeLessonId
                                val isDone = courseProgress.isCompleted(itemLesson.id)
                                val canAccessItem = enrollmentRepository.canAccessLesson(course.id, sIdx, lIdx, itemLesson, currentUser, course.price)

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            if (canAccessItem) {
                                                onSelectLesson(itemLesson.id)
                                            } else {
                                                onLockedLessonClick(itemLesson)
                                            }
                                        }
                                        .background(
                                            if (isCurrent) AppTheme.colors.primary.copy(alpha = 0.15f)
                                            else Color.Transparent
                                        )
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        // Interactive Coursera/Udemy/Web Checkbox
                                        Box(
                                            modifier = Modifier
                                                .size(28.dp)
                                                .clip(CircleShape)
                                                .clickable { onToggleLessonComplete(itemLesson.id) },
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (isDone) {
                                                Icon(
                                                    imageVector = Icons.Default.CheckCircle,
                                                    contentDescription = "Completed",
                                                    tint = Color(0xFF10B981),
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            } else if (isCurrent) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(22.dp)
                                                        .clip(CircleShape)
                                                        .background(AppTheme.colors.primary),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.PlayArrow,
                                                        contentDescription = "Playing",
                                                        tint = Color.White,
                                                        modifier = Modifier.size(13.dp)
                                                    )
                                                }
                                            } else if (!canAccessItem) {
                                                Icon(
                                                    imageVector = Icons.Default.Lock,
                                                    contentDescription = "Locked",
                                                    tint = AppTheme.colors.textMuted,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            } else {
                                                Icon(
                                                    imageVector = Icons.Default.RadioButtonUnchecked,
                                                    contentDescription = "Incomplete",
                                                    tint = AppTheme.colors.textMuted,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.width(10.dp))

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = itemLesson.title,
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                                    color = if (isCurrent) AppTheme.colors.primary else if (!canAccessItem) AppTheme.colors.textSecondary else AppTheme.colors.textPrimary
                                                ),
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "${sIdx + 1}.${lIdx + 1} • ${itemLesson.formattedDuration}",
                                                fontSize = 10.sp,
                                                color = AppTheme.colors.textSecondary
                                            )
                                        }
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        if (isDone) {
                                            Surface(
                                                color = Color(0xFF059669).copy(alpha = 0.2f),
                                                shape = RoundedCornerShape(4.dp)
                                            ) {
                                                Text(
                                                    text = "✓ DONE",
                                                    color = Color(0xFF34D399),
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                                )
                                            }
                                        }

                                        if (itemLesson.resources.isNotEmpty()) {
                                            Surface(
                                                color = Color(0xFFEC4899).copy(alpha = 0.15f),
                                                shape = RoundedCornerShape(4.dp)
                                            ) {
                                                Text(
                                                    text = "${itemLesson.resources.size} notes",
                                                    color = Color(0xFFF472B6),
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                                )
                                            }
                                        }

                                        if (isCurrent) {
                                            Surface(
                                                color = AppTheme.colors.primaryButton,
                                                shape = RoundedCornerShape(4.dp)
                                            ) {
                                                Text(
                                                    text = "PLAYING",
                                                    color = AppTheme.colors.onPrimaryButton,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Black,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        } else if (!canAccessItem) {
                                            Icon(
                                                Icons.Default.Lock,
                                                contentDescription = "Locked",
                                                tint = AppTheme.colors.textMuted,
                                                modifier = Modifier.size(14.dp)
                                            )
                                        }
                                    }
                                }

                                if (lIdx < section.lessons.size - 1) {
                                    HorizontalDivider(
                                        color = Color(0xFF1E293B).copy(alpha = 0.4f),
                                        modifier = Modifier.padding(start = 42.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
