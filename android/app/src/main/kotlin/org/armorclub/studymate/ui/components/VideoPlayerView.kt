package org.armorclub.studymate.ui.components

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.ClosedCaptionOff
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.HighQuality
import androidx.compose.material.icons.filled.Loop
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPicture
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Web
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.service.FloatingVideoService
import org.armorclub.studymate.util.OverlayPermissionHelper

@OptIn(UnstableApi::class)
@ExperimentalMaterial3Api
@Composable
fun VideoPlayerView(
    playerManager: PlayerManager,
    title: String,
    courseId: String,
    lessonId: String,
    modifier: Modifier = Modifier,
    resumePositionMs: Long = 0L,
    isCompleted: Boolean = false,
    onSavePlaybackPosition: ((posMs: Long, durMs: Long) -> Unit)? = null,
    onAutoComplete: (() -> Unit)? = null,
    onBackClick: () -> Unit = {},
    onNextLessonClick: (() -> Unit)? = null,
    onPrevLessonClick: (() -> Unit)? = null,
    onPiPClick: (() -> Unit)? = null,
    isFullScreen: Boolean = false,
    onToggleFullScreen: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val isPlaying by playerManager.isPlaying.collectAsState()
    val currentPositionMs by playerManager.currentPositionMs.collectAsState()
    val durationMs by playerManager.durationMs.collectAsState()
    val playbackSpeed by playerManager.playbackSpeed.collectAsState()

    var showControls by remember { mutableStateOf(true) }
    var isScrubbing by remember { mutableStateOf(false) }
    var scrubPositionMs by remember { mutableLongStateOf(0L) }

    // Double tap ripple feedback state
    var doubleTapSide by remember { mutableStateOf<String?>(null) } // "left" or "right"

    // On-screen display (OSD) feedback HUD (e.g. "Resumed from 04:30", "Lesson completed! (+15 pts)")
    var osdMessage by remember { mutableStateOf<String?>(null) }
    var osdIcon by remember { mutableStateOf<ImageVector?>(null) }
    var osdColor by remember { mutableStateOf(Color(0xFF38BDF8)) }

    // YouTube top-bar toggles
    var isAutoplayEnabled by remember { mutableStateOf(true) }
    var isCaptionsEnabled by remember { mutableStateOf(false) }
    var isLoopEnabled by remember { mutableStateOf(false) }
    var selectedQuality by remember { mutableStateOf("1080p HD") }

    // YouTube-style Settings Bottom Sheet
    var showSettingsSheet by remember { mutableStateOf(false) }
    var settingsSubPage by remember { mutableStateOf("main") } // "main", "speed", "quality"
    val sheetState = rememberModalBottomSheetState()

    // Show "Resumed from MM:SS" OSD badge on start if resuming
    LaunchedEffect(lessonId, resumePositionMs) {
        if (resumePositionMs > 2000L) {
            osdMessage = "Resumed from ${formatMillis(resumePositionMs)}"
            osdIcon = Icons.Default.Schedule
            osdColor = Color(0xFF38BDF8)
            delay(2800)
            osdMessage = null
        }
    }

    // Periodic video progress tracking & auto-complete detection (90%+)
    LaunchedEffect(isPlaying, lessonId) {
        if (isPlaying) {
            while (isActive) {
                delay(2500)
                val curPos = playerManager.currentPositionMs.value
                val dur = playerManager.durationMs.value
                if (dur > 0L) {
                    onSavePlaybackPosition?.invoke(curPos, dur)
                    if (dur > 15_000L && curPos >= (dur * 0.90f) && !isCompleted) {
                        onAutoComplete?.invoke()
                        osdMessage = "Lesson marked as completed! (+15 Points)"
                        osdIcon = Icons.Default.CheckCircle
                        osdColor = Color(0xFF10B981)
                    }
                }
            }
        }
    }

    // Listen for video playback completion (Player.STATE_ENDED)
    LaunchedEffect(lessonId) {
        playerManager.onPlaybackEnded.collect { endedLesson ->
            if (endedLesson.id == lessonId) {
                onAutoComplete?.invoke()
                osdMessage = "Lesson completed! (+15 Points) ✓"
                osdIcon = Icons.Default.CheckCircle
                osdColor = Color(0xFF10B981)

                if (isAutoplayEnabled && onNextLessonClick != null) {
                    delay(2000)
                    onNextLessonClick.invoke()
                }
            }
        }
    }

    // Save playback position on exit/dispose
    DisposableEffect(lessonId) {
        onDispose {
            val curPos = playerManager.currentPositionMs.value
            val dur = playerManager.durationMs.value
            if (curPos > 0L) {
                onSavePlaybackPosition?.invoke(curPos, dur)
            }
        }
    }

    // Auto-hide controls after 3.5 seconds of user inactivity
    LaunchedEffect(showControls, isPlaying, isScrubbing) {
        if (showControls && isPlaying && !isScrubbing) {
            delay(3500)
            showControls = false
        }
    }

    LaunchedEffect(doubleTapSide) {
        if (doubleTapSide != null) {
            delay(750)
            doubleTapSide = null
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(if (isFullScreen) Modifier.fillMaxSize() else Modifier.aspectRatio(16f / 9f))
            .background(Color.Black)
    ) {
        // 1. Android ExoPlayer Video Surface
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = false
                    player = playerManager.exoPlayer
                }
            },
            update = { view ->
                if (view.player != playerManager.exoPlayer) {
                    view.player = playerManager.exoPlayer
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // 2. Gesture Detector Layer (Tap toggle, Double-tap -10s / +10s)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(
                        onTap = {
                            showControls = !showControls
                        },
                        onDoubleTap = { offset ->
                            val isLeft = offset.x < size.width / 2
                            if (isLeft) {
                                playerManager.seekBy(-10_000L)
                                doubleTapSide = "left"
                            } else {
                                playerManager.seekBy(10_000L)
                                doubleTapSide = "right"
                            }
                        }
                    )
                }
        )

        // 3. YouTube-style Double Tap Feedback Ripple (Left & Right)
        doubleTapSide?.let { side ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(if (side == "left") PaddingValues(start = 24.dp) else PaddingValues(end = 24.dp)),
                contentAlignment = if (side == "left") Alignment.CenterStart else Alignment.CenterEnd
            ) {
                Box(
                    modifier = Modifier
                        .size(110.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.22f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = if (side == "left") Icons.Default.Replay10 else Icons.Default.Forward10,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = if (side == "left") "10 seconds" else "10 seconds",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // 3.5. On-Screen Display (OSD) Toast Feedback Badge (e.g. "Resumed from 12:40", "Lesson completed! (+15 pts)")
        AnimatedVisibility(
            visible = osdMessage != null,
            enter = fadeIn() + scaleIn(),
            exit = fadeOut() + scaleOut(),
            modifier = Modifier
                .align(Alignment.Center)
                .padding(16.dp)
        ) {
            Surface(
                color = Color.Black.copy(alpha = 0.88f),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, osdColor.copy(alpha = 0.6f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    osdIcon?.let { icon ->
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = osdColor,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(
                        text = osdMessage ?: "",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // 4. YouTube Player Controls Overlay
        AnimatedVisibility(
            visible = showControls,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.Black.copy(alpha = 0.8f),
                                Color.Black.copy(alpha = 0.25f),
                                Color.Black.copy(alpha = 0.88f)
                            )
                        )
                    )
            ) {
                // TOP BAR: Back, Video Title, Autoplay Switch, Captions, PiP, Settings
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }

                    Text(
                        text = title,
                        color = Color.White,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    // YouTube Autoplay Switch Pill
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isAutoplayEnabled) Color.White.copy(alpha = 0.2f) else Color.Transparent)
                            .clickable { isAutoplayEnabled = !isAutoplayEnabled }
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isAutoplayEnabled) Icons.Default.PlayArrow else Icons.Default.Pause,
                                contentDescription = "Autoplay",
                                tint = if (isAutoplayEnabled) Color(0xFF38BDF8) else Color(0xFF94A3B8),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = "Auto",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isAutoplayEnabled) Color.White else Color(0xFF94A3B8)
                            )
                        }
                    }

                    // CC (Captions) Toggle
                    IconButton(onClick = { isCaptionsEnabled = !isCaptionsEnabled }) {
                        Icon(
                            imageVector = if (isCaptionsEnabled) Icons.Default.ClosedCaption else Icons.Default.ClosedCaptionOff,
                            contentDescription = "Captions",
                            tint = if (isCaptionsEnabled) Color(0xFF38BDF8) else Color.White.copy(alpha = 0.8f),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    // Picture-in-Picture (PiP)
                    onPiPClick?.let { pipAction ->
                        IconButton(onClick = pipAction) {
                            Icon(
                                imageVector = Icons.Default.PictureInPicture,
                                contentDescription = "PiP",
                                tint = Color.White.copy(alpha = 0.85f),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // Settings Gear Icon (Opens YouTube Bottom Sheet)
                    IconButton(onClick = {
                        settingsSubPage = "main"
                        showSettingsSheet = true
                    }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // CENTER CONTROLS: YouTube 5-Item Cluster (⏮, ⏪10, Play/Pause Circle, ⏩10, ⏭)
                Row(
                    modifier = Modifier.align(Alignment.Center),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Previous Lesson Button
                    if (onPrevLessonClick != null) {
                        IconButton(
                            onClick = onPrevLessonClick,
                            modifier = Modifier.size(42.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.SkipPrevious,
                                contentDescription = "Previous Lesson",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.size(42.dp))
                    }

                    // 10s Rewind Button
                    IconButton(
                        onClick = { playerManager.seekBy(-10_000L) },
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Replay10,
                            contentDescription = "Rewind 10s",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    // Large Center YouTube Play/Pause Circle
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.5f))
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) { playerManager.togglePlayPause() },
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.95f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = Color(0xFF0F172A),
                                modifier = Modifier.size(34.dp)
                            )
                        }
                    }

                    // 10s Forward Button
                    IconButton(
                        onClick = { playerManager.seekBy(10_000L) },
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Forward10,
                            contentDescription = "Forward 10s",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    // Next Lesson Button
                    if (onNextLessonClick != null) {
                        IconButton(
                            onClick = onNextLessonClick,
                            modifier = Modifier.size(42.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.SkipNext,
                                contentDescription = "Next Lesson",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.size(42.dp))
                    }
                }

                // BOTTOM CONTROLS & YOUTUBE RED SCRUBBER
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 14.dp, vertical = 4.dp)
                ) {
                    val displayPos = if (isScrubbing) scrubPositionMs else currentPositionMs

                    // YouTube Red Scrub Bar
                    Slider(
                        value = if (durationMs > 0) displayPos.toFloat() / durationMs.toFloat() else 0f,
                        onValueChange = { frac ->
                            isScrubbing = true
                            scrubPositionMs = (frac * durationMs).toLong()
                        },
                        onValueChangeFinished = {
                            playerManager.seekTo(scrubPositionMs)
                            isScrubbing = false
                        },
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFFFF0000),      // YouTube Signature Red
                            activeTrackColor = Color(0xFFFF0000),// YouTube Signature Red
                            inactiveTrackColor = Color.White.copy(alpha = 0.35f)
                        ),
                        modifier = Modifier.fillMaxWidth().height(20.dp)
                    )

                    // Bottom info row: Time (e.g. 01:23 / 45:10) & Speed pill & Fullscreen
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "${formatMillis(displayPos)} / ${formatMillis(durationMs)}",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Current Speed Indicator Pill
                            Surface(
                                color = Color.White.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.clickable {
                                    settingsSubPage = "speed"
                                    showSettingsSheet = true
                                }
                            ) {
                                Text(
                                    text = "${playbackSpeed}x",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }

                            // Fullscreen Toggle (⛶)
                            onToggleFullScreen?.let { toggleAction ->
                                IconButton(
                                    onClick = toggleAction,
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isFullScreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                        contentDescription = if (isFullScreen) "Exit Fullscreen" else "Fullscreen",
                                        tint = Color.White,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 5. YOUTUBE-STYLE SETTINGS MODAL BOTTOM SHEET
    if (showSettingsSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSettingsSheet = false },
            sheetState = sheetState,
            containerColor = Color(0xFF131B2E),
            contentColor = Color.White
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .padding(bottom = 24.dp)
            ) {
                when (settingsSubPage) {
                    "main" -> {
                        Text(
                            text = "Playback Settings",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        // Playback Speed Row
                        YouTubeSettingRow(
                            icon = Icons.Default.Speed,
                            title = "Playback speed",
                            subtitle = if (playbackSpeed == 1.0f) "Normal" else "${playbackSpeed}x",
                            onClick = { settingsSubPage = "speed" }
                        )

                        // Quality Row
                        YouTubeSettingRow(
                            icon = Icons.Default.HighQuality,
                            title = "Quality",
                            subtitle = selectedQuality,
                            onClick = { settingsSubPage = "quality" }
                        )

                        // Loop Video Toggle Row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { isLoopEnabled = !isLoopEnabled }
                                .padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Loop, contentDescription = null, tint = Color(0xFF94A3B8))
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text("Loop video", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                    Text(if (isLoopEnabled) "On" else "Off", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                }
                            }
                            Switch(
                                checked = isLoopEnabled,
                                onCheckedChange = { isLoopEnabled = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF0284C7))
                            )
                        }

                        // Floating Video Service (Draw over other apps)
                        YouTubeSettingRow(
                            icon = Icons.Default.Web,
                            title = "Floating Picture-in-Picture Player",
                            subtitle = "Watch while using other apps",
                            onClick = {
                                showSettingsSheet = false
                                if (OverlayPermissionHelper.hasOverlayPermission(context)) {
                                    FloatingVideoService.start(context, courseId, lessonId, title)
                                    (context as? Activity)?.finish()
                                } else {
                                    OverlayPermissionHelper.requestOverlayPermission(context)
                                }
                            }
                        )
                    }

                    "speed" -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 12.dp)
                        ) {
                            IconButton(onClick = { settingsSubPage = "main" }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                            }
                            Text(
                                text = "Playback Speed",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                        }

                        listOf(
                            0.25f to "0.25x",
                            0.5f to "0.5x",
                            0.75f to "0.75x",
                            1.0f to "Normal",
                            1.25f to "1.25x",
                            1.5f to "1.5x",
                            1.75f to "1.75x",
                            2.0f to "2.0x"
                        ).forEach { (speedVal, speedLabel) ->
                            val isSelected = playbackSpeed == speedVal
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        playerManager.setSpeed(speedVal)
                                        showSettingsSheet = false
                                    }
                                    .padding(vertical = 12.dp, horizontal = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = speedLabel,
                                    color = if (isSelected) Color(0xFF38BDF8) else Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                                if (isSelected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF38BDF8))
                                }
                            }
                        }
                    }

                    "quality" -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 12.dp)
                        ) {
                            IconButton(onClick = { settingsSubPage = "main" }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                            }
                            Text(
                                text = "Quality for current video",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                        }

                        listOf(
                            "Auto (recommended)",
                            "1080p HD (High definition)",
                            "720p HD",
                            "480p",
                            "360p (Data saver)"
                        ).forEach { qOption ->
                            val isSelected = selectedQuality.startsWith(qOption.take(5))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedQuality = qOption
                                        showSettingsSheet = false
                                    }
                                    .padding(vertical = 12.dp, horizontal = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = qOption,
                                    color = if (isSelected) Color(0xFF38BDF8) else Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                                if (isSelected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF38BDF8))
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
private fun YouTubeSettingRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Icon(icon, contentDescription = null, tint = Color(0xFF94A3B8))
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                Text(subtitle, color = Color(0xFF94A3B8), fontSize = 11.sp)
            }
        }
        Text(">", color = Color(0xFF64748B), fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}

private fun formatMillis(millis: Long): String {
    val totalSeconds = (millis / 1000).coerceAtLeast(0L)
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}
