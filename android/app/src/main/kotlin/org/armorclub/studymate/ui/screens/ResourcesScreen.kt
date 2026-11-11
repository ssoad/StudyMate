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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseResource
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.ui.components.UdemyResourceCard
import java.io.File

data class ModuleResourceGroup(
    val moduleTitle: String,
    val moduleCode: String,
    val resources: List<CourseResource>
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResourcesScreen(
    courseRepository: CourseRepository,
    onViewResource: (title: String, fileUrl: String) -> Unit,
    onCourseClick: (String) -> Unit = {},
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var allResources by remember { mutableStateOf<List<CourseResource>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedTypeFilter by remember { mutableStateOf("All") } // All, PDFs, Diagrams
    var selectedModuleFilter by remember { mutableStateOf("All Modules") }

    // Accordion expansion state: maps moduleTitle -> Boolean
    val expandedGroups = remember { mutableStateMapOf<String, Boolean>() }

    fun loadData(refresh: Boolean = false) {
        scope.launch {
            isLoading = true
            courses = courseRepository.getCourses(forceRefresh = refresh)
            allResources = courseRepository.getAllResources(forceRefresh = refresh)
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val primaryCourse = courses.firstOrNull()

    // Helper: Determine Module code/name from resource title/file
    fun resolveModuleForResource(res: CourseResource): Pair<String, String> {
        val t = (res.title + " " + res.fileUrl).lowercase()
        return when {
            t.contains("c-0") || t.contains("module-01") || t.contains("c programming") ->
                "Module 1: C Programming" to "MODULE 01"
            t.contains("ds-0") || t.contains("module-02") || t.contains("data structure") ->
                "Module 2: Data Structures & Algorithms" to "MODULE 02"
            t.contains("dbms") || t.contains("module-03") || t.contains("database") ->
                "Module 3: Database Management Systems (DBMS)" to "MODULE 03"
            t.contains("dld") || t.contains("module-04") || t.contains("digital logic") ->
                "Module 4: Digital Logic Design (DLD)" to "MODULE 04"
            t.contains("networking") || t.contains("module-05") || t.contains("network") ->
                "Module 5: Computer Networking" to "MODULE 05"
            t.contains("osmm") || t.contains("module-06") || t.contains("operating system") || t.contains("linux") ->
                "Module 6: Operating System & Memory Management" to "MODULE 06"
            t.contains("oop") || t.contains("module-07") || t.contains("object oriented") ->
                "Module 7: Object-Oriented Programming (OOP)" to "MODULE 07"
            else ->
                "General Course Handbooks & Question Sets" to "COURSE DOCS"
        }
    }

    // Filter resources
    val filteredResources = allResources.filter { res ->
        val matchesType = when (selectedTypeFilter) {
            "PDFs" -> res.isPdf
            "Diagrams" -> res.isImage
            else -> true
        }
        val (modName, _) = resolveModuleForResource(res)
        val matchesModule = selectedModuleFilter == "All Modules" || modName.startsWith(selectedModuleFilter)

        val matchesSearch = searchQuery.isBlank() ||
                res.title.contains(searchQuery, ignoreCase = true) ||
                res.description.contains(searchQuery, ignoreCase = true) ||
                modName.contains(searchQuery, ignoreCase = true)

        matchesType && matchesModule && matchesSearch
    }

    // Group filtered resources into structured modules
    val moduleOrder = listOf(
        "Module 1: C Programming",
        "Module 2: Data Structures & Algorithms",
        "Module 3: Database Management Systems (DBMS)",
        "Module 4: Digital Logic Design (DLD)",
        "Module 5: Computer Networking",
        "Module 6: Operating System & Memory Management",
        "Module 7: Object-Oriented Programming (OOP)",
        "General Course Handbooks & Question Sets"
    )

    val groupedMap = filteredResources.groupBy { resolveModuleForResource(it).first }

    val moduleGroups = moduleOrder.mapNotNull { modTitle ->
        val items = groupedMap[modTitle]
        if (!items.isNullOrEmpty()) {
            val code = resolveModuleForResource(items.first()).second
            ModuleResourceGroup(
                moduleTitle = modTitle,
                moduleCode = code,
                resources = items
            )
        } else null
    }

    // Automatically expand first 2 groups by default when data loads
    LaunchedEffect(moduleGroups.size) {
        moduleGroups.forEachIndexed { idx, group ->
            if (!expandedGroups.containsKey(group.moduleTitle)) {
                expandedGroups[group.moduleTitle] = idx < 2
            }
        }
    }

    fun expandAll() {
        moduleGroups.forEach { group ->
            expandedGroups[group.moduleTitle] = true
        }
    }

    fun collapseAll() {
        moduleGroups.forEach { group ->
            expandedGroups[group.moduleTitle] = false
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Navigation Menu",
                            tint = AppTheme.colors.textPrimary
                        )
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    Brush.linearGradient(
                                        if (AppTheme.colors.isDark) listOf(Color(0xFF0F172A), Color(0xFF0284C7))
                                        else listOf(Color(0xFF1D4ED8), Color(0xFF2563EB))
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Book,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        Column {
                            Text(
                                text = "Learning Library",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Black,
                                    color = AppTheme.colors.textPrimary
                                )
                            )
                            Text(
                                text = "Handbooks, Question Banks & Notes",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = AppTheme.colors.textSecondary
                                )
                            )
                        }
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
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // 1. Hero Course Context Card
                if (primaryCourse != null) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCourseClick(primaryCourse.id) },
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                            border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(AppTheme.colors.surfaceVariant)
                                ) {
                                    if (primaryCourse.thumbnailUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = primaryCourse.thumbnailUrl,
                                            contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Surface(
                                        color = AppTheme.colors.primary.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "ENROLLED COURSE",
                                            color = AppTheme.colors.primary,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Text(
                                        text = primaryCourse.title,
                                        style = MaterialTheme.typography.titleSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = AppTheme.colors.textPrimary
                                        ),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(
                                            text = "${primaryCourse.sections.size} Modules",
                                            color = AppTheme.colors.textSecondary,
                                            fontSize = 11.sp
                                        )
                                        Text(text = "•", color = AppTheme.colors.textMuted)
                                        Text(
                                            text = "${allResources.size} Study Materials Attached",
                                            color = AppTheme.colors.primary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Search Box
                item {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search by title, question set, or topic...", color = AppTheme.colors.textMuted) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = AppTheme.colors.textMuted) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = AppTheme.colors.primary,
                            unfocusedBorderColor = AppTheme.colors.cardBorder,
                            focusedContainerColor = AppTheme.colors.surfaceVariant,
                            unfocusedContainerColor = AppTheme.colors.surfaceVariant,
                            focusedTextColor = AppTheme.colors.textPrimary,
                            unfocusedTextColor = AppTheme.colors.textPrimary
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // 3. Type Filters (PDFs, Diagrams, All)
                item {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        listOf("All" to "All (${allResources.size})", "PDFs" to "PDFs (${allResources.count { it.isPdf }})", "Diagrams" to "Diagrams (${allResources.count { it.isImage }})").forEach { (key, label) ->
                            FilterChip(
                                selected = selectedTypeFilter == key,
                                onClick = { selectedTypeFilter = key },
                                label = { Text(label, fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AppTheme.colors.primary,
                                    selectedLabelColor = Color.White,
                                    containerColor = AppTheme.colors.surfaceVariant,
                                    labelColor = AppTheme.colors.textSecondary
                                ),
                                shape = RoundedCornerShape(10.dp)
                            )
                        }
                    }
                }

                // 4. Module Fast Filter Chips
                item {
                    val moduleFilters = listOf(
                        "All Modules",
                        "Module 1",
                        "Module 2",
                        "Module 3",
                        "Module 4",
                        "Module 5",
                        "Module 6",
                        "Module 7"
                    )
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(moduleFilters) { mod ->
                            FilterChip(
                                selected = selectedModuleFilter == mod,
                                onClick = { selectedModuleFilter = mod },
                                label = { Text(mod, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AppTheme.colors.primary.copy(alpha = 0.2f),
                                    selectedLabelColor = AppTheme.colors.primary,
                                    containerColor = AppTheme.colors.surfaceVariant,
                                    labelColor = AppTheme.colors.textSecondary
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }

                // 5. Accordion Controls Bar: Total Summary + Expand All / Collapse All
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${moduleGroups.size} Module Groups • ${filteredResources.size} Resources",
                            color = AppTheme.colors.textSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )

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
                }

                // 6. Grouped Resources with Collapsible Accordion Cards
                if (moduleGroups.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No study resources match your filter.",
                                color = AppTheme.colors.textSecondary,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                } else {
                    moduleGroups.forEach { group ->
                        // Accordion Module Card
                        item(key = "grp_" + group.moduleTitle) {
                            val isExpanded = expandedGroups[group.moduleTitle] ?: false
                            val arrowRotation by animateFloatAsState(
                                targetValue = if (isExpanded) 180f else 0f,
                                label = "resource_accordion_arrow"
                            )

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                                border = BorderStroke(
                                    1.dp,
                                    if (isExpanded) AppTheme.colors.primary.copy(alpha = 0.5f) else AppTheme.colors.cardBorder
                                )
                            ) {
                                Column {
                                    // Clickable Accordion Header
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                expandedGroups[group.moduleTitle] = !isExpanded
                                            }
                                            .padding(14.dp),
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
                                                    .background(AppTheme.colors.primary),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    Icons.Default.FolderOpen,
                                                    contentDescription = null,
                                                    tint = Color.White,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(12.dp))

                                            Column {
                                                Text(
                                                    text = group.moduleTitle,
                                                    style = MaterialTheme.typography.titleSmall.copy(
                                                        fontWeight = FontWeight.Bold,
                                                        color = AppTheme.colors.textPrimary
                                                    ),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = "${group.resources.size} study documents",
                                                    fontSize = 11.sp,
                                                    color = AppTheme.colors.textSecondary
                                                )
                                            }
                                        }

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Surface(
                                                color = AppTheme.colors.primary.copy(alpha = 0.15f),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(
                                                    text = "${group.resources.size} files",
                                                    color = AppTheme.colors.primary,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                                )
                                            }

                                            Icon(
                                                imageVector = Icons.Default.KeyboardArrowDown,
                                                contentDescription = if (isExpanded) "Collapse" else "Expand",
                                                tint = if (isExpanded) AppTheme.colors.primary else AppTheme.colors.textMuted,
                                                modifier = Modifier
                                                    .size(22.dp)
                                                    .rotate(arrowRotation)
                                            )
                                        }
                                    }

                                    // Expandable Resources Content
                                    AnimatedVisibility(
                                        visible = isExpanded,
                                        enter = expandVertically() + fadeIn(),
                                        exit = shrinkVertically() + fadeOut()
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(AppTheme.colors.surfaceVariant.copy(alpha = 0.5f))
                                                .padding(12.dp),
                                            verticalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            HorizontalDivider(color = AppTheme.colors.cardBorder)

                                            group.resources.forEach { res ->
                                                UdemyResourceCard(
                                                    resource = res,
                                                    moduleName = group.moduleCode,
                                                    onRead = {
                                                        onViewResource(res.title, res.fileUrl)
                                                    },
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
                                                    }
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
        }
    }
}
