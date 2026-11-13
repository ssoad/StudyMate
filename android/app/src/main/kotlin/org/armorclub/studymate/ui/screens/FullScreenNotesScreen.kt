package org.armorclub.studymate.ui.screens

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Note
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.MarkdownView
import org.armorclub.studymate.util.InstalledNoteApp
import org.armorclub.studymate.util.NotesShareHelper
import org.armorclub.studymate.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullScreenNotesScreen(
    courseId: String,
    lessonId: String,
    lessonTitle: String,
    courseTitle: String,
    notesRepository: NotesRepository,
    playerManager: PlayerManager,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var note by remember { mutableStateOf<Note?>(null) }
    var noteContent by remember { mutableStateOf("") }
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Preview, 1: Edit
    var isSaving by remember { mutableStateOf(false) }
    var installedNoteApps by remember { mutableStateOf<List<InstalledNoteApp>>(emptyList()) }

    val currentVideoPosMs by playerManager.currentPositionMs.collectAsState()

    LaunchedEffect(lessonId) {
        val loaded = notesRepository.getNote(lessonId, courseId, lessonTitle, courseTitle)
        note = loaded
        noteContent = loaded.content
        installedNoteApps = NotesShareHelper.getInstalledNoteApps(context)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Notes: $lessonTitle",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            maxLines = 1
                        )
                        Text(
                            text = courseTitle,
                            style = MaterialTheme.typography.bodySmall.copy(color = AppTheme.colors.textSecondary),
                            maxLines = 1
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Quick Copy
                    IconButton(onClick = {
                        note?.let { n ->
                            NotesShareHelper.copyToClipboard(context, n.copy(content = noteContent))
                        }
                    }) {
                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy to Clipboard")
                    }

                    // Export as .md
                    IconButton(onClick = {
                        note?.let { n ->
                            NotesShareHelper.exportAsMarkdownFile(context, n.copy(content = noteContent))
                        }
                    }) {
                        Icon(Icons.Default.FileDownload, contentDescription = "Export as Markdown")
                    }

                    // Open in Any Note App Chooser
                    IconButton(onClick = {
                        note?.let { n ->
                            NotesShareHelper.openInExternalNotesApp(context, n.copy(content = noteContent))
                        }
                    }) {
                        Icon(Icons.Default.OpenInNew, contentDescription = "Open in Other Note Apps")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppTheme.colors.background
                )
            )
        }
    ) { paddingValues ->
        if (note == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // External Note Apps Quick Action Bar
                InstalledAppsBar(
                    apps = installedNoteApps,
                    onAppClick = { app ->
                        note?.let { n ->
                            NotesShareHelper.openDirectlyInApp(
                                context,
                                n.copy(content = noteContent),
                                app.packageName
                            )
                        }
                    },
                    onOpenAllClick = {
                        note?.let { n ->
                            NotesShareHelper.openInExternalNotesApp(context, n.copy(content = noteContent))
                        }
                    }
                )

                // Tab Switcher: Preview (Rendered Markdown) vs Edit (Markdown Editor)
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Markdown Preview")
                            }
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Edit Note")
                            }
                        }
                    )
                }

                // Quick Timestamp Insertion Banner
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AppTheme.colors.surfaceVariant.copy(alpha = 0.5f))
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    val formattedTimestamp = formatTimestamp(currentVideoPosMs)

                    OutlinedButton(
                        onClick = {
                            val insertion = "\n- [$formattedTimestamp] "
                            noteContent += insertion
                            selectedTab = 1 // switch to editor
                            scope.launch {
                                isSaving = true
                                note?.let { n ->
                                    notesRepository.saveNote(n.copy(content = noteContent))
                                }
                                isSaving = false
                            }
                            Toast.makeText(context, "Timestamp [$formattedTimestamp] inserted!", Toast.LENGTH_SHORT).show()
                        },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.AddComment, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Video Timestamp [$formattedTimestamp]", fontSize = 12.sp)
                    }

                    if (isSaving) {
                        Text(
                            text = "Saving...",
                            style = MaterialTheme.typography.labelSmall.copy(color = AppTheme.colors.primary)
                        )
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = AppTheme.colors.success,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = "Saved",
                                style = MaterialTheme.typography.labelSmall.copy(color = AppTheme.colors.success)
                            )
                        }
                    }
                }

                // Main Content View: Preview or Editor
                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    if (selectedTab == 0) {
                        // Rendered Markdown View
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState())
                                .padding(16.dp)
                        ) {
                            MarkdownView(
                                markdown = noteContent,
                                onTimestampClick = { seekPosMs ->
                                    playerManager.seekTo(seekPosMs)
                                    Toast.makeText(context, "Video jumped to timestamp!", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }
                    } else {
                        // Full Screen Text Editor
                        BasicTextField(
                            value = noteContent,
                            onValueChange = { newText ->
                                noteContent = newText
                                scope.launch {
                                    note?.let { n ->
                                        notesRepository.saveNote(n.copy(content = newText))
                                    }
                                }
                            },
                            textStyle = TextStyle(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 14.sp,
                                lineHeight = 22.sp,
                                color = AppTheme.colors.textPrimary
                            ),
                            cursorBrush = SolidColor(AppTheme.colors.primary),
                            modifier = Modifier
                                .fillMaxSize()
                                .background(AppTheme.colors.background)
                                .padding(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun InstalledAppsBar(
    apps: List<InstalledNoteApp>,
    onAppClick: (InstalledNoteApp) -> Unit,
    onOpenAllClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = AppTheme.colors.surfaceVariant.copy(alpha = 0.4f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Open Note In External Apps:",
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                )
                Text(
                    text = "Choose App ↗",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = AppTheme.colors.primary,
                        fontWeight = FontWeight.SemiBold
                    ),
                    modifier = Modifier.clickable { onOpenAllClick() }
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            if (apps.isEmpty()) {
                OutlinedButton(
                    onClick = onOpenAllClick,
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
                    Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Open in Any Installed Note App (Keep, OneNote, etc.)", fontSize = 12.sp)
                }
            } else {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(vertical = 2.dp)
                ) {
                    items(apps) { app ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(AppTheme.colors.primary.copy(alpha = 0.12f))
                                .clickable { onAppClick(app) }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "📝 ${app.appName}",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = AppTheme.colors.primary
                                )
                            )
                        }
                    }

                    item {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(AppTheme.colors.surfaceVariant)
                                .clickable { onOpenAllClick() }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "More Apps...",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = AppTheme.colors.textSecondary
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatTimestamp(millis: Long): String {
    val totalSeconds = (millis / 1000).coerceAtLeast(0L)
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%02d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}
