package org.armorclub.studymate.ui.screens

import android.text.format.Formatter
import android.content.Intent
import android.net.Uri
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Storage
import androidx.compose.material3.TextButton
import org.armorclub.studymate.data.repository.ThemeMode
import org.armorclub.studymate.ui.components.RowTint
import org.armorclub.studymate.ui.components.SegmentedChoice
import org.armorclub.studymate.ui.components.SettingsGroup
import org.armorclub.studymate.ui.components.SettingsRow
import androidx.compose.ui.Alignment
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
                SettingsGroup(title = "Appearance", footer = themeMode.description) {
                    Column(Modifier.padding(Spacing.md)) {
                        SegmentedChoice(
                            options = ThemeMode.entries,
                            selected = themeMode,
                            label = { it.title },
                            onSelect = { themeRepository.setThemeMode(it) }
                        )
                    }
                }
            }

            item(key = "storage") {
                SettingsGroup(
                    title = "Storage",
                    footer = "Videos you watch are cached so they replay without using data. Up to 256 MB."
                ) {
                    SettingsRow(
                        title = "Offline cache",
                        icon = Icons.Outlined.Storage,
                        tint = RowTint.Neutral,
                        value = cacheBytes?.let { Formatter.formatShortFileSize(context, it) } ?: "…",
                        trailing = {
                            TextButton(
                                onClick = ::clearCache,
                                enabled = !clearing && (cacheBytes ?: 0L) > 0L
                            ) { Text(if (clearing) "Clearing…" else "Clear", color = AppTheme.colors.primary) }
                        }
                    )
                }
            }

            if (showDeveloper) {
                item(key = "developer") {
                    SettingsGroup(title = "Developer", footer = "Where the app loads courses and signs in.") {
                        Column(Modifier.padding(Spacing.md)) {
                            OutlinedTextField(
                                value = serverUrl,
                                onValueChange = { serverUrl = it; testResult = null },
                                label = { Text("Server URL") },
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
                            Spacer(Modifier.height(Spacing.sm))
                            SegmentedChoice(
                                options = listOf(BundledCourses.DEFAULT_BASE_URL, BundledCourses.FALLBACK_WEB_URL),
                                selected = serverUrl,
                                label = { if (it == BundledCourses.DEFAULT_BASE_URL) "Local" else "Production" },
                                onSelect = { serverUrl = it; testResult = null }
                            )
                            Spacer(Modifier.height(Spacing.sm))
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), verticalAlignment = Alignment.CenterVertically) {
                                PrimaryButton("Save", onClick = {
                                    courseRepository.setBaseUrl(serverUrl.trim())
                                    Toast.makeText(context, "Server saved", Toast.LENGTH_SHORT).show()
                                })
                                SecondaryButton(if (testing) "Testing…" else "Test", enabled = !testing, onClick = ::testConnection)
                            }
                            testResult?.let { (ok, msg) ->
                                Spacer(Modifier.height(Spacing.xs))
                                Text(msg, style = MaterialTheme.typography.bodySmall, color = if (ok) AppTheme.colors.success else AppTheme.colors.error)
                            }
                        }
                    }
                }
            }

            item(key = "about") {
                SettingsGroup(title = "About") {
                    SettingsRow(
                        title = "Version",
                        icon = Icons.Outlined.Info,
                        tint = RowTint.Neutral,
                        value = BuildConfig.VERSION_NAME + if (BuildConfig.DEBUG) " (debug)" else "",
                        modifier = Modifier.combinedClickable(
                            onClick = {},
                            onLongClick = {
                                showDeveloper = !showDeveloper
                                Toast.makeText(context, if (showDeveloper) "Developer options shown" else "Developer options hidden", Toast.LENGTH_SHORT).show()
                            }
                        )
                    )
                    SettingsRow(
                        title = "Website",
                        icon = Icons.Outlined.Language,
                        tint = RowTint.Neutral,
                        value = Uri.parse(BundledCourses.FALLBACK_WEB_URL).host,
                        showChevron = true,
                        divider = true,
                        onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledCourses.FALLBACK_WEB_URL))) } }
                    )
                }
            }
        }
    }
}
