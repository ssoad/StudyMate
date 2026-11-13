package org.armorclub.studymate.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.SearchOff
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
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.ui.components.EmptyState
import org.armorclub.studymate.ui.components.EnrollmentDialog
import org.armorclub.studymate.ui.components.FilterPill
import org.armorclub.studymate.ui.components.GhostButton
import org.armorclub.studymate.ui.components.Hairline
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.ScreenHeader
import org.armorclub.studymate.ui.components.SearchField
import org.armorclub.studymate.ui.components.SmCard
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing
import java.io.File

private enum class TypeFilter(val label: String) { All("All"), Pdf("PDFs"), Image("Images"), Link("Links") }

/** A collapsible block of files that belong to one course section (or a course's general files). */
private data class ResourceGroup(
    val key: String,
    val title: String,
    val subtitle: String?,
    val course: Course?,
    val items: List<Pair<CourseResource, String?>> // resource to the lesson title it belongs to
)

/** Groups resources by the course section they really belong to, in curriculum order. */
private fun buildGroups(courses: List<Course>, resources: List<CourseResource>): List<ResourceGroup> {
    val byId = resources.associateBy { it.id }
    val placed = HashSet<String>()
    val multiCourse = courses.size > 1
    val groups = mutableListOf<ResourceGroup>()

    courses.forEach { course ->
        course.sections.sortedBy { it.orderIndex }.forEach { section ->
            val lessonTitles = section.lessons.associate { it.id to it.title }
            val items = resources.filter { r ->
                r.id !in placed && (r.sectionId == section.id || (r.lessonId != null && r.lessonId in lessonTitles))
            }.map { it to it.lessonId?.let(lessonTitles::get) }
            if (items.isNotEmpty()) {
                items.forEach { placed += it.first.id }
                groups += ResourceGroup(
                    key = "s-${section.id}",
                    title = section.title,
                    subtitle = if (multiCourse) course.title else null,
                    course = course,
                    items = items
                )
            }
        }
        val general = resources.filter { it.id !in placed && it.courseId == course.id }
        if (general.isNotEmpty()) {
            general.forEach { placed += it.id }
            groups += ResourceGroup("c-${course.id}", "General files", if (multiCourse) course.title else null, course, general.map { it to null })
        }
    }
    val rest = byId.values.filter { it.id !in placed }
    if (rest.isNotEmpty()) groups += ResourceGroup("other", "Other files", null, courses.firstOrNull(), rest.map { it to null })
    return groups
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResourcesScreen(
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    enrollmentRepository: EnrollmentRepository,
    onViewResource: (title: String, fileUrl: String) -> Unit,
    onCourseClick: (String) -> Unit = {},
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val currentUser by authRepository.currentUser.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()

    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var resources by remember { mutableStateOf<List<CourseResource>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var enrollCourse by remember { mutableStateOf<Course?>(null) }

    var query by rememberSaveable { mutableStateOf("") }
    var typeFilter by rememberSaveable { mutableStateOf(TypeFilter.All) }
    val expanded = remember { mutableStateMapOf<String, Boolean>() }

    suspend fun load(refresh: Boolean) {
        courses = courseRepository.getCourses(forceRefresh = refresh)
        resources = courseRepository.getAllResources(forceRefresh = refresh)
    }
    LaunchedEffect(Unit) {
        load(false)
        isLoading = false
    }

    val allGroups = remember(courses, resources) { buildGroups(courses, resources) }
    val groups = remember(allGroups, query, typeFilter) {
        val q = query.trim()
        allGroups.mapNotNull { g ->
            val items = g.items.filter { (r, lesson) ->
                val typeOk = when (typeFilter) {
                    TypeFilter.All -> true
                    TypeFilter.Pdf -> r.isPdf
                    TypeFilter.Image -> r.isImage
                    TypeFilter.Link -> r.isLink
                }
                typeOk && (q.isEmpty() || r.title.contains(q, true) || r.description.contains(q, true) ||
                    g.title.contains(q, true) || lesson?.contains(q, true) == true)
            }
            if (items.isEmpty()) null else g.copy(items = items)
        }
    }
    val searching = query.isNotBlank() || typeFilter != TypeFilter.All
    val approvedIds = remember(courses, enrollments, currentUser) {
        courses.filter { enrollmentRepository.isCourseApproved(it.id, currentUser, it.price) }.map { it.id }.toSet()
    }
    val lockedCourse = courses.firstOrNull { it.id !in approvedIds }

    fun isLocked(course: Course?) = course != null && course.id !in approvedIds

    fun onLockedTap(course: Course?) {
        if (currentUser == null) {
            Toast.makeText(context, "Sign in and enroll to open course files", Toast.LENGTH_SHORT).show()
        } else if (course != null) {
            enrollCourse = course
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

    fun open(res: CourseResource) {
        if (res.isLink) {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(res.fileUrl))) }
                .onFailure { Toast.makeText(context, "No app can open this link", Toast.LENGTH_SHORT).show() }
        } else {
            onViewResource(res.title, res.fileUrl)
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
    ) {
        ScreenHeader(
            title = "Resources",
            subtitle = if (resources.isNotEmpty()) "${resources.size} notes and files" else null,
            leading = {
                IconButton(onClick = onOpenDrawer) {
                    Icon(Icons.Outlined.Menu, contentDescription = "Open menu", tint = AppTheme.colors.textPrimary)
                }
            }
        )
        SearchField(
            value = query,
            onValueChange = { query = it },
            placeholder = "Search notes and files",
            modifier = Modifier.padding(horizontal = Spacing.gutter, vertical = Spacing.xs)
        )
        Row(
            Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = Spacing.gutter, vertical = Spacing.xs),
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            TypeFilter.entries.forEach { f ->
                FilterPill(f.label, selected = typeFilter == f, onClick = { typeFilter = f })
            }
        }

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppTheme.colors.primary, strokeWidth = 2.dp)
            }

            resources.isEmpty() -> EmptyState(
                icon = Icons.Outlined.FolderOpen,
                title = "No files yet",
                body = "Notes and handouts appear here once they're added to a course."
            )

            else -> PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = {
                    scope.launch {
                        isRefreshing = true
                        load(true)
                        isRefreshing = false
                    }
                },
                modifier = Modifier.fillMaxSize()
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, top = Spacing.xs, bottom = Spacing.xl),
                    verticalArrangement = Arrangement.spacedBy(Spacing.sm)
                ) {
                    if (lockedCourse != null && !searching) {
                        item(key = "unlock") {
                            SmCard {
                                Text("Most files are locked", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                                Text(
                                    "Enroll in ${lockedCourse.title} to read and download its notes.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppTheme.colors.textSecondary
                                )
                                Spacer(Modifier.size(Spacing.sm))
                                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                    PrimaryButton("Enroll", onClick = { onLockedTap(lockedCourse) })
                                    GhostButton("View course", onClick = { onCourseClick(lockedCourse.id) })
                                }
                            }
                        }
                    }

                    if (groups.isEmpty()) {
                        item(key = "no-results") {
                            EmptyState(
                                icon = Icons.Outlined.SearchOff,
                                title = "No matching files",
                                body = "Try another search or filter.",
                                actionText = "Clear filters",
                                onAction = { query = ""; typeFilter = TypeFilter.All }
                            )
                        }
                    }

                    groups.forEachIndexed { index, group ->
                        item(key = group.key) {
                            // While searching, open every group so matches are visible.
                            val isOpen = searching || (expanded[group.key] ?: (index == 0))
                            ResourceGroupCard(
                                group = group,
                                isOpen = isOpen,
                                locked = isLocked(group.course),
                                onToggle = { expanded[group.key] = !isOpen },
                                onOpen = { res -> if (isLocked(group.course)) onLockedTap(group.course) else open(res) },
                                onDownload = ::download
                            )
                        }
                    }
                }
            }
        }
    }

    enrollCourse?.let { course ->
        EnrollmentDialog(
            course = course,
            userId = currentUser?.id ?: "guest",
            enrollmentRepository = enrollmentRepository,
            onDismiss = { enrollCourse = null },
            onSuccess = {
                Toast.makeText(context, "Enrollment submitted. We'll unlock files once it's approved.", Toast.LENGTH_LONG).show()
            }
        )
    }
}

@Composable
private fun ResourceGroupCard(
    group: ResourceGroup,
    isOpen: Boolean,
    locked: Boolean,
    onToggle: () -> Unit,
    onOpen: (CourseResource) -> Unit,
    onDownload: (CourseResource) -> Unit
) {
    val rotation by animateFloatAsState(if (isOpen) 180f else 0f, label = "chevron")
    SmCard(padding = 0.dp) {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onToggle)
                .padding(Spacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                group.subtitle?.let {
                    Text(it, style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Text(group.title, style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                Text(
                    "${group.items.size} ${if (group.items.size == 1) "file" else "files"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = AppTheme.colors.textSecondary
                )
            }
            Icon(
                Icons.Outlined.ExpandMore,
                contentDescription = if (isOpen) "Collapse" else "Expand",
                tint = AppTheme.colors.textMuted,
                modifier = Modifier.rotate(rotation)
            )
        }
        AnimatedVisibility(isOpen) {
            Column {
                Hairline()
                group.items.forEach { (res, lessonTitle) ->
                    FileRow(res, lessonTitle, locked, onOpen = { onOpen(res) }, onDownload = { onDownload(res) })
                }
            }
        }
    }
}

@Composable
private fun FileRow(
    res: CourseResource,
    lessonTitle: String?,
    locked: Boolean,
    onOpen: () -> Unit,
    onDownload: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(onClick = onOpen)
            .padding(start = Spacing.md, end = Spacing.xxs, top = Spacing.xs, bottom = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        FormatTag(res.fileFormatBadge)
        Spacer(Modifier.width(Spacing.sm))
        Column(Modifier.weight(1f)) {
            Text(
                res.title,
                style = MaterialTheme.typography.bodyMedium,
                color = if (locked) AppTheme.colors.textSecondary else AppTheme.colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            val meta = listOfNotNull(lessonTitle, res.fileSize.takeIf { it.isNotBlank() }).joinToString(" · ")
            if (meta.isNotEmpty()) {
                Text(meta, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        when {
            locked -> Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Lock, contentDescription = "Locked", tint = AppTheme.colors.textMuted, modifier = Modifier.size(18.dp))
            }
            res.isLink -> Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null, tint = AppTheme.colors.textSecondary, modifier = Modifier.size(18.dp))
            }
            else -> IconButton(onClick = onDownload) {
                Icon(Icons.Outlined.Download, contentDescription = "Download ${res.title}", tint = AppTheme.colors.textSecondary, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun FormatTag(label: String) {
    Box(
        Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(Radius.xs))
            .background(AppTheme.colors.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = AppTheme.colors.textSecondary)
    }
}
