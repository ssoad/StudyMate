package org.armorclub.studymate.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.ui.components.Badge
import org.armorclub.studymate.ui.components.BadgeTone
import org.armorclub.studymate.ui.components.EnrollmentDialog
import org.armorclub.studymate.ui.components.GhostButton
import org.armorclub.studymate.ui.components.Hairline
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.ProgressTrack
import org.armorclub.studymate.ui.components.SecondaryButton
import org.armorclub.studymate.ui.components.SectionHeader
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing
import java.io.File

@Composable
fun CourseDetailScreen(
    courseId: String,
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    progressRepository: ProgressRepository,
    enrollmentRepository: EnrollmentRepository,
    onBackClick: () -> Unit,
    onSelectLesson: (courseId: String, lessonId: String) -> Unit,
    onViewResource: (title: String, fileUrl: String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val currentUser by authRepository.currentUser.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()
    val progressMap by progressRepository.progressMap.collectAsState()
    val userId = progressRepository.getGuestOrUserId()
    val courseProgress = progressMap[courseId] ?: progressRepository.getCourseProgress(userId, courseId)

    var course by remember { mutableStateOf<Course?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showEnrollmentDialog by remember { mutableStateOf(false) }
    var descriptionExpanded by remember { mutableStateOf(false) }
    val expandedSections = remember { mutableStateMapOf<String, Boolean>() }
    val expandedFaqs = remember { mutableStateMapOf<Int, Boolean>() }

    LaunchedEffect(courseId) {
        isLoading = true
        val c = courseRepository.getCourse(courseId)
        course = c
        c?.sections?.forEachIndexed { i, s -> expandedSections[s.id] = i == 0 }
        isLoading = false
    }

    fun shareCourse(c: Course) {
        val link = "${BundledCourses.FALLBACK_WEB_URL}/courses/${c.id}"
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, c.title)
            putExtra(Intent.EXTRA_TEXT, "${c.title}\n$link")
        }
        context.startActivity(Intent.createChooser(send, "Share course"))
    }

    fun download(res: CourseResource) {
        scope.launch {
            Toast.makeText(context, "Downloading ${res.title}", Toast.LENGTH_SHORT).show()
            val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
            val ok = courseRepository.downloadResourceFile(res.fileUrl, dest)
            Toast.makeText(context, if (ok) "Saved ${dest.name}" else "Download failed. Try again.", Toast.LENGTH_SHORT).show()
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(AppTheme.colors.background)
            .statusBarsPadding()
    ) {
        // Top bar
        Row(
            Modifier.fillMaxWidth().height(56.dp).padding(horizontal = Spacing.xxs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = AppTheme.colors.textPrimary)
            }
            Spacer(Modifier.weight(1f))
            course?.let { c ->
                IconButton(onClick = { shareCourse(c) }) {
                    Icon(Icons.Outlined.Share, contentDescription = "Share course", tint = AppTheme.colors.textPrimary)
                }
            }
        }

        val c = course
        if (isLoading || c == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                if (isLoading) {
                    CircularProgressIndicator(color = AppTheme.colors.primary, strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
                } else {
                    Text("This course couldn't be loaded.", color = AppTheme.colors.textSecondary)
                }
            }
            return@Column
        }

        val isApproved = enrollmentRepository.isCourseApproved(courseId, currentUser, c.price)
        val enrollment = enrollments[courseId]
        val allLessons = remember(c) { c.sections.flatMap { it.lessons } }
        val completedCount = allLessons.count { courseProgress.isCompleted(it.id) }
        val progress = if (allLessons.isEmpty()) 0f else completedCount.toFloat() / allLessons.size
        val lastLesson = allLessons.firstOrNull { it.id == courseProgress.lastLessonId }
        val firstLesson = allLessons.firstOrNull()
        val totalResources = c.totalResourcesCount
        val hasFreePreview = firstLesson != null &&
            enrollmentRepository.canAccessLesson(c.id, 0, 0, firstLesson, currentUser, c.price)
        val allExpanded = c.sections.isNotEmpty() && c.sections.all { expandedSections[it.id] == true }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
        ) {
            // Hero
            item(key = "hero") {
                Column {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .clip(RoundedCornerShape(Radius.card))
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
                    Spacer(Modifier.height(Spacing.md))
                    if (c.category.isNotBlank()) {
                        Text(c.category, style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.primary)
                        Spacer(Modifier.height(Spacing.xxs))
                    }
                    Text(c.title, style = MaterialTheme.typography.headlineSmall, color = AppTheme.colors.textPrimary)
                    Spacer(Modifier.height(Spacing.xs))
                    Text(
                        listOfNotNull(
                            c.instructorName.takeIf { it.isNotBlank() },
                            "${allLessons.size} lessons".takeIf { allLessons.isNotEmpty() },
                            c.duration.takeIf { it.isNotBlank() }
                        ).joinToString(" · "),
                        style = MaterialTheme.typography.bodyMedium,
                        color = AppTheme.colors.textSecondary
                    )
                    if (c.description.isNotBlank()) {
                        Spacer(Modifier.height(Spacing.sm))
                        Text(
                            c.description,
                            style = MaterialTheme.typography.bodyLarge,
                            color = AppTheme.colors.textSecondary,
                            maxLines = if (descriptionExpanded) Int.MAX_VALUE else 4,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (c.description.length > 220) {
                            Text(
                                if (descriptionExpanded) "Show less" else "Show more",
                                style = MaterialTheme.typography.labelLarge,
                                color = AppTheme.colors.primary,
                                modifier = Modifier
                                    .padding(top = Spacing.xxs)
                                    .clip(RoundedCornerShape(Radius.xs))
                                    .clickable { descriptionExpanded = !descriptionExpanded }
                                    .padding(vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // Progress + primary action
            item(key = "cta") {
                Column(Modifier.padding(top = Spacing.lg)) {
                    if (isApproved && allLessons.isNotEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "$completedCount of ${allLessons.size} lessons done",
                                style = MaterialTheme.typography.bodyMedium,
                                color = AppTheme.colors.textSecondary,
                                modifier = Modifier.weight(1f)
                            )
                            Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                        }
                        Spacer(Modifier.height(Spacing.xs))
                        ProgressTrack(progress)
                        Spacer(Modifier.height(Spacing.md))
                    }
                    when {
                        isApproved -> {
                            val target = lastLesson ?: firstLesson
                            if (target != null) {
                                PrimaryButton(
                                    text = when {
                                        completedCount == 0 && lastLesson == null -> "Start course"
                                        else -> "Continue: ${target.title}"
                                    },
                                    onClick = { onSelectLesson(c.id, target.id) },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                        enrollment?.isPending == true -> {
                            StatusNote(
                                icon = Icons.Outlined.Schedule,
                                tone = BadgeTone.Warning,
                                title = "Payment under review",
                                body = "৳${enrollment.amount.toInt()} via ${enrollment.paymentMethod}" +
                                    (enrollment.transactionId.takeIf { it.isNotBlank() }?.let { " · TrxID $it" } ?: "") +
                                    ". You'll get access as soon as it's approved."
                            )
                            Spacer(Modifier.height(Spacing.sm))
                            SecondaryButton("View payment details", onClick = { showEnrollmentDialog = true }, modifier = Modifier.fillMaxWidth())
                        }
                        enrollment?.isRejected == true -> {
                            StatusNote(
                                icon = Icons.Outlined.ErrorOutline,
                                tone = BadgeTone.Danger,
                                title = "Payment couldn't be verified",
                                body = enrollment.adminNotes ?: "Check the transaction ID and sender number, then submit again."
                            )
                            Spacer(Modifier.height(Spacing.sm))
                            PrimaryButton("Resubmit payment", onClick = { showEnrollmentDialog = true }, modifier = Modifier.fillMaxWidth())
                        }
                        else -> {
                            PrimaryButton(
                                text = if (c.isPaidCourse) "Enroll · ৳" + "%,d".format(c.price?.toInt() ?: 0) else "Enroll for free",
                                onClick = { showEnrollmentDialog = true },
                                modifier = Modifier.fillMaxWidth()
                            )
                            if (hasFreePreview && firstLesson != null) {
                                Spacer(Modifier.height(Spacing.xs))
                                SecondaryButton(
                                    "Watch the free first lesson",
                                    onClick = { onSelectLesson(c.id, firstLesson.id) },
                                    icon = Icons.Outlined.PlayCircle,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }

            // Curriculum
            item(key = "curriculum_header") {
                Row(verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        SectionHeader("Curriculum")
                        Text(
                            "${c.sections.size} modules · ${allLessons.size} lessons" +
                                (if (totalResources > 0) " · $totalResources files" else ""),
                            style = MaterialTheme.typography.bodySmall,
                            color = AppTheme.colors.textSecondary
                        )
                    }
                    if (c.sections.size > 1) {
                        GhostButton(
                            if (allExpanded) "Collapse all" else "Expand all",
                            onClick = { c.sections.forEach { expandedSections[it.id] = !allExpanded } }
                        )
                    }
                }
                Spacer(Modifier.height(Spacing.sm))
            }

            itemsIndexed(c.sections, key = { _, s -> "sec_" + s.id }) { sIdx, section ->
                val isExpanded = expandedSections[section.id] == true
                val rotation by animateFloatAsState(if (isExpanded) 180f else 0f, label = "chevron")
                val doneInSection = section.lessons.count { courseProgress.isCompleted(it.id) }
                val shape = RoundedCornerShape(Radius.card)

                Column(
                    Modifier
                        .padding(bottom = Spacing.xs)
                        .fillMaxWidth()
                        .clip(shape)
                        .background(AppTheme.colors.surface)
                        .border(1.dp, AppTheme.colors.cardBorder, shape)
                ) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { expandedSections[section.id] = !isExpanded }
                            .padding(Spacing.md),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            if (!section.title.trimStart().startsWith("Module", ignoreCase = true)) {
                                Text(
                                    "Module ${sIdx + 1}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = AppTheme.colors.textMuted
                                )
                            }
                            Text(section.title, style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                            Text(
                                "${section.lessons.size} lessons" + if (isApproved) " · $doneInSection done" else "",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isApproved && doneInSection == section.lessons.size && section.lessons.isNotEmpty())
                                    AppTheme.colors.success else AppTheme.colors.textSecondary
                            )
                        }
                        Icon(
                            Icons.Outlined.ExpandMore,
                            contentDescription = if (isExpanded) "Collapse" else "Expand",
                            tint = AppTheme.colors.textMuted,
                            modifier = Modifier.rotate(rotation)
                        )
                    }

                    AnimatedVisibility(visible = isExpanded, enter = expandVertically(), exit = shrinkVertically()) {
                        Column(Modifier.fillMaxWidth()) {
                            Hairline()
                            if (section.resources.isNotEmpty()) {
                                val canAccessRes = enrollmentRepository.canAccessResource(c.id, null, currentUser, c.price)
                                section.resources.forEach { res ->
                                    ResourceRow(
                                        resource = res,
                                        locked = !canAccessRes,
                                        onOpen = { if (canAccessRes) onViewResource(res.title, res.fileUrl) else showEnrollmentDialog = true },
                                        onDownload = { download(res) }
                                    )
                                }
                                Hairline()
                            }
                            section.lessons.forEachIndexed { lIdx, lesson ->
                                val canPreview = enrollmentRepository.canAccessLesson(c.id, sIdx, lIdx, lesson, currentUser, c.price)
                                val canAccess = isApproved || canPreview
                                val isDone = courseProgress.isCompleted(lesson.id)
                                val isCurrent = lesson.id == courseProgress.lastLessonId
                                LessonRow(
                                    title = lesson.title,
                                    icon = when {
                                        isDone -> Icons.Outlined.CheckCircle
                                        canAccess -> Icons.Outlined.PlayCircle
                                        else -> Icons.Outlined.Lock
                                    },
                                    iconTint = when {
                                        isDone -> AppTheme.colors.success
                                        isCurrent -> AppTheme.colors.primary
                                        canAccess -> AppTheme.colors.textSecondary
                                        else -> AppTheme.colors.textMuted
                                    },
                                    titleColor = if (canAccess) AppTheme.colors.textPrimary else AppTheme.colors.textSecondary,
                                    highlighted = isCurrent && isApproved,
                                    trailing = {
                                        when {
                                            canPreview && !isApproved -> Badge("Free", BadgeTone.Success)
                                            lesson.resources.isNotEmpty() -> Text(
                                                "${lesson.resources.size} file${if (lesson.resources.size > 1) "s" else ""}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = AppTheme.colors.textMuted
                                            )
                                        }
                                    },
                                    onClick = {
                                        if (canAccess) onSelectLesson(c.id, lesson.id) else showEnrollmentDialog = true
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // FAQ
            item(key = "faq") {
                SectionHeader("Questions")
                val faqs = listOf(
                    "How does enrollment work?" to
                        "Send the course fee by bKash, Nagad, Rocket or bank transfer, then submit your sender number and transaction ID. An admin verifies the payment and unlocks the course.",
                    "How long does approval take?" to
                        "Payments are checked by hand, usually within an hour.",
                    "Can I download the notes?" to
                        "Yes. Once you're enrolled, every PDF and note in the curriculum can be opened in the app or downloaded."
                )
                Column {
                    faqs.forEachIndexed { i, (q, a) ->
                        val open = expandedFaqs[i] == true
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .clickable { expandedFaqs[i] = !open }
                                .padding(vertical = Spacing.sm)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(q, style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary, modifier = Modifier.weight(1f))
                                Icon(
                                    Icons.Outlined.ExpandMore,
                                    contentDescription = null,
                                    tint = AppTheme.colors.textMuted,
                                    modifier = Modifier.rotate(if (open) 180f else 0f)
                                )
                            }
                            AnimatedVisibility(open, enter = expandVertically(), exit = shrinkVertically()) {
                                Text(
                                    a,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = AppTheme.colors.textSecondary,
                                    modifier = Modifier.padding(top = Spacing.xs)
                                )
                            }
                        }
                        if (i < faqs.lastIndex) Hairline()
                    }
                }
            }
        }

        if (showEnrollmentDialog) {
            EnrollmentDialog(
                course = c,
                userId = userId,
                enrollmentRepository = enrollmentRepository,
                onDismiss = { showEnrollmentDialog = false },
                onSuccess = {
                    Toast.makeText(context, "Payment submitted. We'll notify you once it's approved.", Toast.LENGTH_LONG).show()
                }
            )
        }
    }
}

@Composable
private fun StatusNote(icon: ImageVector, tone: BadgeTone, title: String, body: String) {
    val c = AppTheme.colors
    val (bg, fg) = when (tone) {
        BadgeTone.Warning -> c.warningContainer to c.warning
        BadgeTone.Danger -> c.errorContainer to c.error
        BadgeTone.Success -> c.successContainer to c.success
        else -> c.surfaceVariant to c.textSecondary
    }
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.control))
            .background(bg)
            .padding(Spacing.sm)
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(Spacing.sm))
        Column {
            Text(title, style = MaterialTheme.typography.titleSmall, color = fg)
            Spacer(Modifier.height(2.dp))
            Text(body, style = MaterialTheme.typography.bodySmall, color = c.textSecondary)
        }
    }
}

@Composable
private fun LessonRow(
    title: String,
    icon: ImageVector,
    iconTint: Color,
    titleColor: Color,
    highlighted: Boolean,
    trailing: @Composable () -> Unit,
    onClick: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .background(if (highlighted) AppTheme.colors.primaryContainer else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = Spacing.md, vertical = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(Spacing.sm))
        Text(
            title,
            style = MaterialTheme.typography.bodyMedium,
            color = titleColor,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Spacer(Modifier.width(Spacing.xs))
        trailing()
    }
}

@Composable
private fun ResourceRow(resource: CourseResource, locked: Boolean, onOpen: () -> Unit, onDownload: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clickable(onClick = onOpen)
            .padding(start = Spacing.md, end = Spacing.xxs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            if (locked) Icons.Outlined.Lock else Icons.Outlined.Description,
            contentDescription = null,
            tint = AppTheme.colors.textMuted,
            modifier = Modifier.size(20.dp)
        )
        Spacer(Modifier.width(Spacing.sm))
        Text(
            resource.title,
            style = MaterialTheme.typography.bodyMedium,
            color = if (locked) AppTheme.colors.textSecondary else AppTheme.colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        if (!locked && !resource.isLink) {
            IconButton(onClick = onDownload) {
                Icon(Icons.Outlined.Download, contentDescription = "Download ${resource.title}", tint = AppTheme.colors.textSecondary, modifier = Modifier.size(20.dp))
            }
        } else {
            Spacer(Modifier.width(Spacing.sm))
        }
    }
}
