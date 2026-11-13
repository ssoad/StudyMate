package org.armorclub.studymate.ui.screens

import android.text.format.Formatter
import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.armorclub.studymate.BuildConfig
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.ThemeRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.FilterPill
import org.armorclub.studymate.ui.components.ListRow
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.ScreenHeader
import org.armorclub.studymate.ui.components.SecondaryButton
import org.armorclub.studymate.ui.components.SectionHeader
import org.armorclub.studymate.ui.components.SmCard
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun SettingsScreen(
    courseRepository: CourseRepository,
    playerManager: PlayerManager,
    themeRepository: ThemeRepository,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val themeMode by themeRepository.themeMode.collectAsState()

    var cacheBytes by remember { mutableStateOf<Long?>(null) }
    var clearing by remember { mutableStateOf(false) }

    var showDeveloper by rememberSaveable { mutableStateOf(BuildConfig.DEBUG) }
    var serverUrl by rememberSaveable { mutableStateOf(courseRepository.getBaseUrl()) }
    var testing by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf<Pair<Boolean, String>?>(null) }

    LaunchedEffect(Unit) {
        cacheBytes = withContext(Dispatchers.IO) { runCatching { PlayerManager.cacheSizeBytes(context) }.getOrNull() }
    }

    fun clearCache() {
        scope.launch {
            clearing = true
            val ok = withContext(Dispatchers.IO) { runCatching { PlayerManager.clearCaches(context) }.isSuccess }
            cacheBytes = withContext(Dispatchers.IO) { runCatching { PlayerManager.cacheSizeBytes(context) }.getOrNull() }
            clearing = false
            Toast.makeText(context, if (ok) "Cache cleared" else "Couldn't clear everything", Toast.LENGTH_SHORT).show()
        }
    }

    fun testConnection() {
        scope.launch {
            testing = true
            testResult = null
            testResult = withContext(Dispatchers.IO) {
                try {
                    val client = OkHttpClient.Builder()
                        .connectTimeout(4, TimeUnit.SECONDS)
                        .readTimeout(4, TimeUnit.SECONDS)
                        .build()
                    val req = Request.Builder().url("${serverUrl.trim().trimEnd('/')}/api/health").build()
                    client.newCall(req).execute().use { resp ->
                        if (resp.isSuccessful) true to "Connected" else false to "Server responded with ${resp.code}"
                    }
                } catch (e: Exception) {
                    false to "Couldn't connect: ${e.localizedMessage ?: "unknown error"}"
                }
            }
            testing = false
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
    ) {
        ScreenHeader(
            title = "Settings",
            leading = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = AppTheme.colors.textPrimary)
                }
            }
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
        ) {
            item(key = "appearance") {
                SectionHeader("Appearance")
                SmCard(padding = 0.dp) {
                    org.armorclub.studymate.data.repository.ThemeMode.entries.forEachIndexed { i, mode ->
                        ListRow(
                            title = mode.title,
                            subtitle = mode.description,
                            showDivider = i < org.armorclub.studymate.data.repository.ThemeMode.entries.lastIndex,
                            onClick = { themeRepository.setThemeMode(mode) },
                            modifier = Modifier.padding(horizontal = Spacing.md),
                            trailing = {
                                if (themeMode == mode) {
                                    Icon(Icons.Outlined.Check, contentDescription = "Selected", tint = AppTheme.colors.primary, modifier = Modifier.size(20.dp))
                                }
                            }
                        )
                    }
                }
            }

            item(key = "storage") {
                SectionHeader("Storage")
                SmCard {
                    Text("Offline cache", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                    Text(
                        cacheBytes?.let { "Using ${Formatter.formatShortFileSize(context, it)}. Videos you've watched replay from here without data." }
                            ?: "Calculating…",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppTheme.colors.textSecondary
                    )
                    Spacer(Modifier.height(Spacing.sm))
                    SecondaryButton(
                        text = if (clearing) "Clearing…" else "Clear cache",
                        enabled = !clearing && (cacheBytes ?: 0L) > 0L,
                        onClick = ::clearCache
                    )
                }
            }

            if (showDeveloper) {
                item(key = "developer") {
                    SectionHeader("Developer")
                    SmCard {
                        Text("Server", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                        Text(
                            "Where the app loads courses and signs in.",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppTheme.colors.textSecondary
                        )
                        Spacer(Modifier.height(Spacing.sm))
                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it; testResult = null },
                            label = { Text("Base URL") },
                            singleLine = true,
                            shape = RoundedCornerShape(Radius.control),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AppTheme.colors.primary,
                                unfocusedBorderColor = AppTheme.colors.cardBorder,
                                focusedLabelColor = AppTheme.colors.primary,
                                unfocusedLabelColor = AppTheme.colors.textMuted,
                                focusedTextColor = AppTheme.colors.textPrimary,
                                unfocusedTextColor = AppTheme.colors.textPrimary,
                                cursorColor = AppTheme.colors.primary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(Spacing.xs))
                        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            FilterPill("Local", selected = serverUrl == BundledCourses.DEFAULT_BASE_URL, onClick = { serverUrl = BundledCourses.DEFAULT_BASE_URL; testResult = null })
                            FilterPill("Production", selected = serverUrl == BundledCourses.FALLBACK_WEB_URL, onClick = { serverUrl = BundledCourses.FALLBACK_WEB_URL; testResult = null })
                        }
                        Spacer(Modifier.height(Spacing.sm))
                        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            PrimaryButton("Save", onClick = {
                                courseRepository.setBaseUrl(serverUrl.trim())
                                Toast.makeText(context, "Server saved", Toast.LENGTH_SHORT).show()
                            })
                            SecondaryButton(if (testing) "Testing…" else "Test", enabled = !testing, onClick = ::testConnection)
                        }
                        if (testing) {
                            Spacer(Modifier.height(Spacing.xs))
                            CircularProgressIndicator(color = AppTheme.colors.primary, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                        }
                        testResult?.let { (ok, msg) ->
                            Spacer(Modifier.height(Spacing.xs))
                            Text(msg, style = MaterialTheme.typography.bodySmall, color = if (ok) AppTheme.colors.success else AppTheme.colors.error)
                        }
                    }
                }
            }

            item(key = "about") {
                SectionHeader("About")
                SmCard(
                    modifier = Modifier.combinedClickable(
                        onClick = {},
                        onLongClick = {
                            showDeveloper = !showDeveloper
                            Toast.makeText(context, if (showDeveloper) "Developer options shown" else "Developer options hidden", Toast.LENGTH_SHORT).show()
                        }
                    )
                ) {
                    Text("StudyMate", style = MaterialTheme.typography.titleSmall, color = AppTheme.colors.textPrimary)
                    Text(
                        "Version ${BuildConfig.VERSION_NAME}" + if (BuildConfig.DEBUG) " · debug build" else "",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppTheme.colors.textSecondary
                    )
                }
            }
        }
    }
}
