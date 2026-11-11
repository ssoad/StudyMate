package org.armorclub.studymate.ui.screens

import androidx.compose.foundation.BorderStroke
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.collectAsState
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseDetailScreen(
    courseId: String,
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    progressRepository: ProgressRepository,
    onBackClick: () -> Unit,
    onSelectLesson: (courseId: String, lessonId: String) -> Unit,
    onViewResource: (title: String, fileUrl: String) -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    val currentUser by authRepository.currentUser.collectAsState()
    val userId = currentUser?.id ?: "demo-student-id-001"

    val progressMap by progressRepository.progressMap.collectAsState()
    val courseProgress = progressMap[courseId] ?: progressRepository.getCourseProgress(userId, courseId)

    var course by remember { mutableStateOf<Course?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    val completedCount = course?.let { progressRepository.getCompletedCount(userId, it) } ?: 0
    val progressPercent = course?.let { progressRepository.getCourseProgressPercentage(userId, it) } ?: 0
    val lastLessonId = courseProgress.lastLessonId
    val lastLesson = course?.sections?.flatMap { it.lessons }?.firstOrNull { it.id == lastLessonId }

    // Accordion expansion state: maps section.id -> Boolean
    val expandedSections = remember { mutableStateMapOf<String, Boolean>() }

    // FAQ expansion state: maps question index -> Boolean
    val expandedFaqs = remember { mutableStateMapOf<Int, Boolean>() }

    // Preview lesson modal state
    var previewLesson by remember { mutableStateOf<CourseLesson?>(null) }

    LaunchedEffect(courseId) {
        isLoading = true
        val c = courseRepository.getCourse(courseId)
        course = c
        // Expand first 2 sections by default, just like the web app
        c?.sections?.forEachIndexed { index, section ->
            expandedSections[section.id] = index < 2
        }
        isLoading = false
    }

    fun expandAll() {
        course?.sections?.forEach { section ->
            expandedSections[section.id] = true
        }
    }

    fun collapseAll() {
        course?.sections?.forEach { section ->
            expandedSections[section.id] = false
        }
    }

    fun copyCourseShareLink(c: Course) {
        val shareText = "Check out ${c.title} on StudyMate: 45+ lectures, notes & complete curriculum!"
        clipboardManager.setText(AnnotatedString(shareText))
        Toast.makeText(context, "Course link copied to clipboard!", Toast.LENGTH_SHORT).show()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = course?.title ?: "Course Overview",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = AppTheme.colors.textPrimary
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = AppTheme.colors.textPrimary
                        )
                    }
                },
                actions = {
                    course?.let { c ->
                        IconButton(onClick = { copyCourseShareLink(c) }) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Share",
                                tint = AppTheme.colors.textPrimary
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppTheme.colors.topAppBarBackground
                )
            )
        },
        containerColor = AppTheme.colors.background
    ) { paddingValues ->
        if (isLoading || course == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = AppTheme.colors.primary)
            }
        } else {
            val c = course!!
            val firstLesson = c.sections.firstOrNull()?.lessons?.firstOrNull()
            val totalLectures = c.totalLessonsCount
            val totalResources = c.resources.size + c.sections.sumOf { s ->
                s.resources.size + s.lessons.sumOf { it.resources.size }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. HERO CARD (Udemy & Coursera Style with Preview Video Overlay)
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column {
                            // 16:9 Thumbnail with interactive Play Video Preview Overlay
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp)
                                    .background(Color(0xFF0F172A))
                                    .clickable {
                                        if (firstLesson != null) {
                                            previewLesson = firstLesson
                                        }
                                    }
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
                                                    listOf(Color.Black.copy(alpha = 0.3f), AppTheme.colors.cardBackground)
                                                )
                                            )
                                    )
                                }

                                // Centered Play Preview Badge (Udemy Video Preview style)
                                Column(
                                    modifier = Modifier.align(Alignment.Center),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(54.dp)
                                            .clip(CircleShape)
                                            .background(Color.White.copy(alpha = 0.95f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.PlayArrow,
                                            contentDescription = "Preview Lecture",
                                            tint = AppTheme.colors.primary,
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Surface(
                                        color = Color.Black.copy(alpha = 0.75f),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text(
                                            text = "Watch Preview Lecture",
                                            color = Color.White,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                // Category Pill
                                Surface(
                                    color = AppTheme.colors.primaryContainer,
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier
                                        .padding(12.dp)
                                        .align(Alignment.TopStart)
                                ) {
                                    Text(
                                        text = c.category.uppercase(),
                                        color = AppTheme.colors.onPrimaryContainer,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            // Card Body Details
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = c.title,
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontWeight = FontWeight.Black,
                                        color = AppTheme.colors.textPrimary
                                    )
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = c.description,
                                    style = MaterialTheme.typography.bodySmall.copy(color = AppTheme.colors.textSecondary),
                                    lineHeight = 18.sp
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                // Quick Stats Row (Rating, Students, Duration, Modules)
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Star,
                                            contentDescription = null,
                                            tint = Color(0xFFF59E0B),
                                            modifier = Modifier.size(15.dp)
                                        )
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text(
                                            "${c.rating}",
                                            color = AppTheme.colors.textPrimary,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Group,
                                            contentDescription = null,
                                            tint = AppTheme.colors.primary,
                                            modifier = Modifier.size(15.dp)
                                        )
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text(
                                            "${c.enrolledCount} enrolled",
                                            color = AppTheme.colors.textSecondary,
                                            fontSize = 12.sp
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.AccessTime,
                                            contentDescription = null,
                                            tint = AppTheme.colors.secondary,
                                            modifier = Modifier.size(15.dp)
                                        )
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text(
                                            c.duration,
                                            color = AppTheme.colors.textSecondary,
                                            fontSize = 12.sp
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))
                                HorizontalDivider(color = AppTheme.colors.divider)
                                Spacer(modifier = Modifier.height(14.dp))

                                // Instructor Information
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .clip(CircleShape)
                                            .background(
                                                Brush.linearGradient(
                                                    listOf(Color(0xFF6366F1), Color(0xFF0284C7))
                                                )
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = c.instructorName.take(2).uppercase(),
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Column {
                                        Text(
                                            text = "INSTRUCTOR",
                                            fontSize = 10.sp,
                                            color = AppTheme.colors.textMuted,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 1.sp
                                        )
                                        Text(
                                            text = c.instructorName,
                                            color = AppTheme.colors.textPrimary,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = c.instructorTitle.ifBlank { "Expert Computer Science & ICT Instructor" },
                                            color = AppTheme.colors.textSecondary,
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // Real Course Progress Indicator (Matching Web App)
                                if (completedCount > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Your Progress: $completedCount / ${c.totalLessonsCount} lectures",
                                            color = Color(0xFF10B981),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "$progressPercent%",
                                            color = Color(0xFF38BDF8),
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
                                        trackColor = Color(0xFF1E293B)
                                    )
                                    Spacer(modifier = Modifier.height(14.dp))
                                }

                                // Primary CTA Button: Resume or Enter Classroom
                                val targetLesson = lastLesson ?: firstLesson
                                if (targetLesson != null) {
                                    Button(
                                        onClick = { onSelectLesson(c.id, targetLesson.id) },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (completedCount > 0) AppTheme.colors.success else AppTheme.colors.primaryButton,
                                            contentColor = AppTheme.colors.onPrimaryButton
                                        ),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp)
                                    ) {
                                        Icon(
                                            if (completedCount > 0) Icons.Default.PlayCircle else Icons.Default.PlayArrow,
                                            contentDescription = null,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = if (lastLesson != null) "Resume: ${lastLesson.title.take(22)}... 🚀" else "Enter Classroom 🚀",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. "THIS COURSE INCLUDES" PERKS BOX (Udemy Standard)
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "THIS COURSE INCLUDES:",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = AppTheme.colors.primary,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            CoursePerkRow(
                                icon = Icons.Default.PlayCircle,
                                text = "$totalLectures on-demand hardware-accelerated video lectures"
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            CoursePerkRow(
                                icon = Icons.Default.Book,
                                text = "$totalResources lecture notes, reference PDFs & MCQs"
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            CoursePerkRow(
                                icon = Icons.Default.AccessTime,
                                text = "Full lifetime access with offline reading & range seeking"
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            CoursePerkRow(
                                icon = Icons.Default.School,
                                text = "Certificate of syllabus completion"
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            CoursePerkRow(
                                icon = Icons.Default.Shield,
                                text = "Direct instructor Q&A & classroom notes integration"
                            )
                        }
                    }
                }

                // 3. CURRICULUM ACCORDION HEADER (With Expand All / Collapse All Buttons!)
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Course Curriculum",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Black,
                                    color = AppTheme.colors.textPrimary
                                )
                            )
                            Text(
                                text = "${c.sections.size} Modules • $totalLectures Lectures • ${c.duration} Total Length",
                                color = AppTheme.colors.textSecondary,
                                fontSize = 11.sp
                            )
                        }

                        // Expand All & Collapse All Controls (Exact Web Parity!)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(
                                onClick = { expandAll() },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colors.primary),
                                border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Text("Expand All", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { collapseAll() },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colors.textSecondary),
                                border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Text("Collapse", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // 4. ACCORDION MODULES (Collapsible Section Accordions)
                itemsIndexed(c.sections, key = { _, s -> "sec_" + s.id }) { sIdx, section ->
                    val isExpanded = expandedSections[section.id] ?: false
                    val arrowRotation by animateFloatAsState(
                        targetValue = if (isExpanded) 180f else 0f,
                        label = "accordion_arrow"
                    )

                    val sectionPdfCount = section.resources.size + section.lessons.sumOf { it.resources.size }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                        border = BorderStroke(
                            1.dp,
                            if (isExpanded) AppTheme.colors.primary.copy(alpha = 0.5f) else AppTheme.colors.cardBorder
                        )
                    ) {
                        Column {
                            // CLICKABLE ACCORDION HEADER
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        expandedSections[section.id] = !isExpanded
                                    }
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    // Module Number Badge (e.g. 1, 2, 3...)
                                    Box(
                                        modifier = Modifier
                                            .size(34.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(AppTheme.colors.primary.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "${sIdx + 1}",
                                            color = AppTheme.colors.primary,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Column {
                                        Text(
                                            text = section.title,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = AppTheme.colors.textPrimary
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        val sectionDoneCount = section.lessons.count { courseProgress.isCompleted(it.id) }
                                        Text(
                                            text = "${section.lessons.size} Lectures • $sectionDoneCount completed" + if (sectionPdfCount > 0) " • $sectionPdfCount Notes & PDFs" else "",
                                            fontSize = 11.sp,
                                            color = if (sectionDoneCount == section.lessons.size && section.lessons.isNotEmpty()) AppTheme.colors.success else AppTheme.colors.textSecondary
                                        )
                                    }
                                }

                                // Animated Chevron Indicator
                                Icon(
                                    imageVector = Icons.Default.KeyboardArrowDown,
                                    contentDescription = if (isExpanded) "Collapse" else "Expand",
                                    tint = if (isExpanded) AppTheme.colors.primary else AppTheme.colors.textMuted,
                                    modifier = Modifier
                                        .size(24.dp)
                                        .rotate(arrowRotation)
                                )
                            }

                            // EXPANDABLE CONTENT (Lessons & Section Materials)
                            AnimatedVisibility(
                                visible = isExpanded,
                                enter = expandVertically() + fadeIn(),
                                exit = shrinkVertically() + fadeOut()
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(AppTheme.colors.surfaceVariant.copy(alpha = 0.5f))
                                ) {
                                    HorizontalDivider(color = AppTheme.colors.divider)

                                    // 1. Attached Module Resources (if any)
                                    if (section.resources.isNotEmpty()) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 14.dp, vertical = 10.dp)
                                        ) {
                                            Text(
                                                text = "SECTION MATERIALS",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Black,
                                                color = AppTheme.colors.success,
                                                letterSpacing = 1.sp
                                            )
                                            Spacer(modifier = Modifier.height(6.dp))
                                            section.resources.forEach { res ->
                                                ResourceRowItem(
                                                    resource = res,
                                                    onRead = { onViewResource(res.title, res.fileUrl) },
                                                    onDownload = {
                                                        scope.launch {
                                                             Toast.makeText(context, "Downloading ${res.title}...", Toast.LENGTH_SHORT).show()
                                                             val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
                                                             courseRepository.downloadResourceFile(res.fileUrl, dest)
                                                             Toast.makeText(context, "Saved to ${dest.name}", Toast.LENGTH_SHORT).show()
                                                        }
                                                    }
                                                )
                                                Spacer(modifier = Modifier.height(6.dp))
                                            }
                                        }
                                        HorizontalDivider(color = AppTheme.colors.divider)
                                    }

                                    // 2. Section Lessons List (Udemy Lecture Row)
                                    section.lessons.forEachIndexed { lIdx, lesson ->
                                        val canPreview = lesson.isPreview || (sIdx == 0 && lIdx == 0)
                                        val hasNotes = lesson.resources.isNotEmpty()
                                        val isDone = courseProgress.isCompleted(lesson.id)

                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable { onSelectLesson(c.id, lesson.id) }
                                                .padding(horizontal = 14.dp, vertical = 12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                // Play Icon / Completed Icon
                                                Box(
                                                    modifier = Modifier
                                                        .size(28.dp)
                                                        .clip(CircleShape)
                                                        .background(
                                                            if (isDone) Color(0xFF059669).copy(alpha = 0.2f)
                                                            else if (canPreview) Color(0xFF10B981).copy(alpha = 0.15f)
                                                            else AppTheme.colors.primary.copy(alpha = 0.15f)
                                                        ),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    if (isDone) {
                                                        Icon(
                                                            Icons.Default.CheckCircle,
                                                            contentDescription = "Completed",
                                                            tint = Color(0xFF10B981),
                                                            modifier = Modifier.size(18.dp)
                                                        )
                                                    } else {
                                                        Icon(
                                                            Icons.Default.PlayArrow,
                                                            contentDescription = null,
                                                            tint = if (canPreview) Color(0xFF10B981) else AppTheme.colors.primary,
                                                            modifier = Modifier.size(16.dp)
                                                        )
                                                    }
                                                }

                                                Spacer(modifier = Modifier.width(10.dp))

                                                // Lecture Index e.g. 1.1
                                                Text(
                                                    text = "${sIdx + 1}.${lIdx + 1}",
                                                    fontSize = 11.sp,
                                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                                    color = Color(0xFF64748B),
                                                    fontWeight = FontWeight.Bold
                                                )

                                                Spacer(modifier = Modifier.width(8.dp))

                                                // Lecture Title
                                                Text(
                                                    text = lesson.title,
                                                    style = MaterialTheme.typography.bodyMedium.copy(
                                                        fontWeight = FontWeight.Medium,
                                                        color = AppTheme.colors.textPrimary
                                                    ),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    modifier = Modifier.weight(1f)
                                                )
                                            }

                                            // Trailing Badges & Actions
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                if (hasNotes) {
                                                    Surface(
                                                        color = Color(0xFFEC4899).copy(alpha = 0.15f),
                                                        shape = RoundedCornerShape(4.dp)
                                                    ) {
                                                        Row(
                                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Icon(
                                                                Icons.Default.PictureAsPdf,
                                                                contentDescription = null,
                                                                tint = Color(0xFFF472B6),
                                                                modifier = Modifier.size(10.dp)
                                                            )
                                                            Spacer(modifier = Modifier.width(3.dp))
                                                            Text(
                                                                text = "${lesson.resources.size} Note${if (lesson.resources.size > 1) "s" else ""}",
                                                                color = Color(0xFFF472B6),
                                                                fontSize = 9.sp,
                                                                fontWeight = FontWeight.Bold
                                                            )
                                                        }
                                                    }
                                                }

                                                if (canPreview) {
                                                    Surface(
                                                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                                                        shape = RoundedCornerShape(6.dp),
                                                        modifier = Modifier.clickable { previewLesson = lesson }
                                                    ) {
                                                        Text(
                                                            text = "Preview",
                                                            color = Color(0xFF10B981),
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                                        )
                                                    }
                                                }

                                                // Watch Button
                                                IconButton(
                                                    onClick = { onSelectLesson(c.id, lesson.id) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(
                                                        Icons.Default.PlayCircle,
                                                        contentDescription = "Play",
                                                        tint = AppTheme.colors.primary,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                            }
                                        }

                                        if (lIdx < section.lessons.size - 1) {
                                            HorizontalDivider(
                                                color = AppTheme.colors.divider,
                                                modifier = Modifier.padding(start = 54.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 5. FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION (Web Parity!)
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                        border = BorderStroke(1.dp, AppTheme.colors.cardBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.HelpOutline,
                                    contentDescription = null,
                                    tint = AppTheme.colors.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Frequently Asked Questions",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = AppTheme.colors.textPrimary
                                    )
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            val faqs = listOf(
                                "How does manual enrollment work?" to
                                    "Send the course fee via bKash, Nagad, Rocket, or Bank transfer to our official account. Submit your sender number and Transaction ID. The administrator verifies the transaction and activates full classroom access immediately.",
                                "How long does approval take?" to
                                    "Enrollments are reviewed manually around the clock. Approvals typically take between 15 minutes to 1 hour.",
                                "Can I watch videos offline or stream them fast?" to
                                    "All lectures are hosted with high-performance HTTP 206 range-seeking streaming with ExoPlayer, allowing instant scrubbing and buffering without lag."
                            )

                            faqs.forEachIndexed { fIdx, (q, a) ->
                                val isOpen = expandedFaqs[fIdx] ?: false
                                val faqArrow by animateFloatAsState(
                                    targetValue = if (isOpen) 180f else 0f,
                                    label = "faq_arrow"
                                )

                                Surface(
                                    color = AppTheme.colors.surfaceVariant.copy(alpha = 0.5f),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { expandedFaqs[fIdx] = !isOpen }
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = q,
                                                color = AppTheme.colors.textPrimary,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Icon(
                                                imageVector = Icons.Default.KeyboardArrowDown,
                                                contentDescription = null,
                                                tint = AppTheme.colors.textSecondary,
                                                modifier = Modifier
                                                    .size(18.dp)
                                                    .rotate(faqArrow)
                                            )
                                        }

                                        AnimatedVisibility(
                                            visible = isOpen,
                                            enter = expandVertically() + fadeIn(),
                                            exit = shrinkVertically() + fadeOut()
                                        ) {
                                            Column {
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text(
                                                    text = a,
                                                    color = AppTheme.colors.textSecondary,
                                                    fontSize = 12.sp,
                                                    lineHeight = 18.sp
                                                )
                                            }
                                        }
                                    }
                                }
                                if (fIdx < faqs.size - 1) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                        }
                    }
                }
            }

            // FREE PREVIEW LECTURE MODAL DIALOG
            previewLesson?.let { lesson ->
                Dialog(
                    onDismissRequest = { previewLesson = null },
                    properties = DialogProperties(usePlatformDefaultWidth = false)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.85f))
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF131B2E))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "FREE PREVIEW LECTURE",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFF10B981),
                                            letterSpacing = 1.sp
                                        )
                                        Text(
                                            text = lesson.title,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    IconButton(onClick = { previewLesson = null }) {
                                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                Text(
                                    text = "Ready to start this lecture in full high-definition video player with complete notes and scrubbing?",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 12.sp
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                Button(
                                    onClick = {
                                        val lId = lesson.id
                                        previewLesson = null
                                        onSelectLesson(c.id, lId)
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = AppTheme.colors.primaryButton,
                                        contentColor = AppTheme.colors.onPrimaryButton
                                    )
                                ) {
                                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Watch Lecture Now", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CoursePerkRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFF38BDF8),
            modifier = Modifier.size(15.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = text,
            color = Color(0xFFCBD5E1),
            fontSize = 12.sp
        )
    }
}

@Composable
private fun ResourceRowItem(
    resource: CourseResource,
    onRead: () -> Unit,
    onDownload: () -> Unit
) {
    Surface(
        color = Color(0xFF1E293B).copy(alpha = 0.5f),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = Icons.Default.PictureAsPdf,
                    contentDescription = null,
                    tint = Color(0xFFEC4899),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = resource.title,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onRead, modifier = Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.Visibility,
                        contentDescription = "Read",
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(16.dp)
                    )
                }
                IconButton(onClick = onDownload, modifier = Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.Download,
                        contentDescription = "Download",
                        tint = Color(0xFF10B981),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
