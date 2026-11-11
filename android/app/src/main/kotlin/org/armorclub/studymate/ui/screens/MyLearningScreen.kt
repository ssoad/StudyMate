package org.armorclub.studymate.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.theme.AppTheme

private fun formatTime(millis: Long): String {
    val totalSeconds = (millis / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%02d:%02d", minutes, seconds)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyLearningScreen(
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    progressRepository: ProgressRepository,
    playerManager: PlayerManager,
    onCourseClick: (String) -> Unit,
    onResumeLessonClick: (courseId: String, lessonId: String) -> Unit,
    onOpenDrawer: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    val currentUser by authRepository.currentUser.collectAsState()
    val userId = progressRepository.getGuestOrUserId()
    val progressMap by progressRepository.progressMap.collectAsState()

    val activeLesson by playerManager.activeLesson.collectAsState()
    val activeCourseId by playerManager.activeCourseId.collectAsState()

    fun loadData(refresh: Boolean = false) {
        scope.launch {
            isLoading = true
            courses = courseRepository.getCourses(forceRefresh = refresh)
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val enrolledCourse = courses.firstOrNull { it.id == "complexity-it-01" } ?: courses.firstOrNull()
    val enrolledProgress = enrolledCourse?.let { progressMap[it.id] ?: progressRepository.getCourseProgress(userId, it.id) }
    val completedCount = enrolledCourse?.let { progressRepository.getCompletedCount(userId, it) } ?: 0
    val progressPercent = enrolledCourse?.let { progressRepository.getCourseProgressPercentage(userId, it) } ?: 0

    val lastLessonId = enrolledProgress?.lastLessonId
    val targetLesson = activeLesson ?: (if (enrolledCourse != null && lastLessonId != null) enrolledCourse.sections.flatMap { it.lessons }.firstOrNull { it.id == lastLessonId } else null) ?: enrolledCourse?.sections?.firstOrNull()?.lessons?.firstOrNull()
    val targetCourseId = activeCourseId ?: enrolledCourse?.id
    val savedPlaybackPos = if (targetCourseId != null && targetLesson != null) progressRepository.getPlaybackPosition(targetCourseId, targetLesson.id) else 0L

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    Brush.linearGradient(
                                        listOf(Color(0xFF6366F1), Color(0xFF0284C7))
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.PlayCircle,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        Column {
                            Text(
                                text = "My Learning",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Continue Learning & Curriculum Progress",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color(0xFF94A3B8)
                                )
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Menu",
                            tint = AppTheme.colors.textPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData(refresh = true) }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = AppTheme.colors.textPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppTheme.colors.topAppBarBackground
                )
            )
        },
        containerColor = AppTheme.colors.background
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = AppTheme.colors.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. ACTIVE / RESUME PLAYING CARD (Dynamic Progress & Last Watched)
                if (targetLesson != null && targetCourseId != null) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onResumeLessonClick(targetCourseId, targetLesson.id) },
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = AppTheme.colors.primaryButton),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Surface(
                                        color = Color.White.copy(alpha = 0.2f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = if (activeLesson != null) "NOW PLAYING" else "RESUME LEARNING",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }

                                    Icon(
                                        Icons.Default.PlayArrow,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = targetLesson.title,
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = enrolledCourse?.title ?: "Computer Science & ICT",
                                    color = Color.White.copy(alpha = 0.8f),
                                    fontSize = 12.sp
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Course Progress: $progressPercent%",
                                        color = Color.White.copy(alpha = 0.95f),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "$completedCount / ${enrolledCourse?.totalLessonsCount ?: 0} done",
                                        color = Color.White.copy(alpha = 0.8f),
                                        fontSize = 11.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                LinearProgressIndicator(
                                    progress = { progressPercent / 100f },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = Color.White,
                                    trackColor = Color.White.copy(alpha = 0.25f)
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                Button(
                                    onClick = { onResumeLessonClick(targetCourseId, targetLesson.id) },
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(
                                        Icons.Default.PlayArrow,
                                        contentDescription = null,
                                        tint = AppTheme.colors.primaryButton,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = if (savedPlaybackPos > 2000L) "Resume from ${formatTime(savedPlaybackPos)}" else "Resume Lecture",
                                        color = AppTheme.colors.primaryButton,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // 2. ENROLLED COURSE OVERVIEW CARD
                if (enrolledCourse != null) {
                    val c = enrolledCourse
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCourseClick(c.id) },
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                            border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(160.dp)
                                        .background(Color(0xFF1E1B4B))
                                ) {
                                    if (c.thumbnailUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = c.thumbnailUrl,
                                            contentDescription = c.title,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                        Box(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .background(
                                                    Brush.verticalGradient(
                                                        listOf(Color.Transparent, AppTheme.colors.cardBackground)
                                                    )
                                                )
                                        )
                                    }

                                    Surface(
                                        color = AppTheme.colors.success,
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier
                                            .padding(12.dp)
                                            .align(Alignment.TopStart)
                                    ) {
                                        Text(
                                            text = "ENROLLED • IN PROGRESS",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                        )
                                    }
                                }

                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = c.title,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = AppTheme.colors.textPrimary
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Text(
                                        text = "${c.sections.size} Modules • ${c.totalLessonsCount} Lectures • ${c.duration}",
                                        color = AppTheme.colors.textSecondary,
                                        fontSize = 12.sp
                                    )

                                    Spacer(modifier = Modifier.height(14.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Curriculum Completion",
                                            color = AppTheme.colors.textSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = "$progressPercent% Complete ($completedCount / ${c.totalLessonsCount})",
                                            color = AppTheme.colors.success,
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
                                        color = AppTheme.colors.success,
                                        trackColor = AppTheme.colors.cardBorder
                                    )

                                    Spacer(modifier = Modifier.height(14.dp))

                                    Button(
                                        onClick = { onCourseClick(c.id) },
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = AppTheme.colors.primaryButton,
                                            contentColor = AppTheme.colors.onPrimaryButton
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.School, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Open Course Syllabus", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }

                    // 3. QUICK MODULE JUMP LIST (Coursera Pattern)
                    item {
                        Text(
                            text = "Course Modules (${c.sections.size})",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = AppTheme.colors.textPrimary
                            )
                        )
                    }

                    itemsIndexed(c.sections) { idx, section ->
                        val firstLesson = section.lessons.firstOrNull()
                        val sectionDone = section.lessons.count { enrolledProgress?.isCompleted(it.id) == true }
                        val isFullyDone = sectionDone == section.lessons.size && section.lessons.isNotEmpty()

                        Surface(
                            color = AppTheme.colors.cardBackground,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (firstLesson != null) {
                                        onResumeLessonClick(c.id, firstLesson.id)
                                    } else {
                                        onCourseClick(c.id)
                                    }
                                }
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
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(
                                                if (isFullyDone) Color(0xFF059669)
                                                else AppTheme.colors.primary.copy(alpha = 0.15f)
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (isFullyDone) {
                                            Icon(
                                                Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        } else {
                                            Text(
                                                text = "${idx + 1}",
                                                color = AppTheme.colors.primary,
                                                fontWeight = FontWeight.Black,
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
                                                color = AppTheme.colors.textPrimary
                                            ),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = "${section.lessons.size} lectures • $sectionDone completed",
                                            fontSize = 11.sp,
                                            color = if (isFullyDone) AppTheme.colors.success else AppTheme.colors.textSecondary
                                        )
                                    }
                                }

                                Icon(
                                    Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = if (isFullyDone) Color(0xFF10B981) else Color(0xFF38BDF8),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
