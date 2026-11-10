package org.armorclub.studymate.ui.screens

import android.content.Intent
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
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseResource
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
    onCourseClick: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var allResources by remember { mutableStateOf<List<CourseResource>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedTypeFilter by remember { mutableStateOf("All") } // All, PDFs, Diagrams
    var selectedModuleFilter by remember { mutableStateOf("All Modules") }

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

    // Group filtered resources by Module
    val moduleGroups = filteredResources
        .groupBy { resolveModuleForResource(it) }
        .map { (pair, list) ->
            ModuleResourceGroup(
                moduleTitle = pair.first,
                moduleCode = pair.second,
                resources = list
            )
        }
        .sortedBy { it.moduleCode }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Resource Library",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                        )
                        Text(
                            text = "Organized by Course & Curriculum Modules",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color(0xFF94A3B8)
                            )
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData(refresh = true) }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0B0F19)
                )
            )
        },
        containerColor = Color(0xFF0B0F19)
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF0284C7))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Featured Course Banner (Udemy Style Course Container)
                if (primaryCourse != null) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCourseClick(primaryCourse.id) },
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF131B2E)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                        ) {
                            Column {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(130.dp)
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(Color(0xFF1E1B4B), Color(0xFF0F172A))
                                            )
                                        )
                                ) {
                                    if (primaryCourse.thumbnailUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = primaryCourse.thumbnailUrl,
                                            contentDescription = primaryCourse.title,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                        Box(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .background(
                                                    Brush.verticalGradient(
                                                        listOf(Color.Transparent, Color(0xFF131B2E))
                                                    )
                                                )
                                        )
                                    }

                                    Surface(
                                        color = Color(0xFF0284C7),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier
                                            .padding(12.dp)
                                            .align(Alignment.TopStart)
                                    ) {
                                        Text(
                                            text = "COURSE RESOURCES HUB",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(
                                        text = primaryCourse.title,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.School,
                                                contentDescription = null,
                                                tint = Color(0xFF94A3B8),
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "7 Modules",
                                                color = Color(0xFF94A3B8),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }

                                        Text(text = "•", color = Color(0xFF475569))

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.Book,
                                                contentDescription = null,
                                                tint = Color(0xFF38BDF8),
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "${allResources.size} Study Materials Attached",
                                                color = Color(0xFF38BDF8),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
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
                        placeholder = { Text("Search by title, question set, or topic...", color = Color(0xFF64748B)) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF64748B)) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF0284C7),
                            unfocusedBorderColor = Color(0xFF1E293B),
                            focusedContainerColor = Color(0xFF131B2E),
                            unfocusedContainerColor = Color(0xFF131B2E),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
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
                        listOf("All" to "All (${allResources.size})", "PDFs" to "PDFs (22)", "Diagrams" to "Diagrams (4)").forEach { (key, label) ->
                            FilterChip(
                                selected = selectedTypeFilter == key,
                                onClick = { selectedTypeFilter = key },
                                label = { Text(label, fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFF0284C7),
                                    selectedLabelColor = Color.White,
                                    containerColor = Color(0xFF131B2E),
                                    labelColor = Color(0xFF94A3B8)
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
                        "Module 6"
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
                                    selectedContainerColor = Color(0xFF38BDF8).copy(alpha = 0.2f),
                                    selectedLabelColor = Color(0xFF38BDF8),
                                    containerColor = Color(0xFF1E293B),
                                    labelColor = Color(0xFF94A3B8)
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }

                // 5. Grouped Resources by Course Modules
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
                                color = Color(0xFF94A3B8),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                } else {
                    moduleGroups.forEach { group ->
                        // Module Section Header
                        item {
                            Surface(
                                color = Color(0xFF1E293B).copy(alpha = 0.6f),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
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
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(Color(0xFF0284C7)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.FolderOpen,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(10.dp))

                                        Text(
                                            text = group.moduleTitle,
                                            style = MaterialTheme.typography.titleSmall.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            ),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }

                                    Surface(
                                        color = Color(0xFF0284C7).copy(alpha = 0.2f),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text(
                                            text = "${group.resources.size} files",
                                            color = Color(0xFF38BDF8),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Resources inside this Module
                        items(group.resources, key = { it.id }) { res ->
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
                                    scope.launch {
                                        val dest = File(context.getExternalFilesDir(null) ?: context.filesDir, res.displayFileName)
                                        if (!dest.exists()) {
                                            courseRepository.downloadResourceFile(res.fileUrl, dest)
                                        }
                                        val uri = androidx.core.content.FileProvider.getUriForFile(
                                            context,
                                            "${context.packageName}.fileprovider",
                                            dest
                                        )
                                        val mime = if (res.isPdf) "application/pdf" else "image/*"
                                        val intent = Intent(Intent.ACTION_VIEW).apply {
                                            setDataAndType(uri, mime)
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        context.startActivity(Intent.createChooser(intent, "Open with"))
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
