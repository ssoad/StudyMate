package org.armorclub.studymate.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.OpenInFull
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import org.armorclub.studymate.ui.theme.AppTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.armorclub.studymate.player.PlayerManager
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun InAppPictureInPicture(
    playerManager: PlayerManager,
    onExpand: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val activeLesson by playerManager.activeLesson.collectAsState()
    val isPlaying by playerManager.isPlaying.collectAsState()
    val currentPositionMs by playerManager.currentPositionMs.collectAsState()
    val durationMs by playerManager.durationMs.collectAsState()

    val lesson = activeLesson ?: return
    val coroutineScope = rememberCoroutineScope()

    var showControls by remember { mutableStateOf(false) }
    var isDraggingActive by remember { mutableStateOf(false) }
    var lastTapTime by remember { mutableLongStateOf(0L) }

    // Auto-hide controls after 3.5 seconds of user inactivity while playing
    LaunchedEffect(showControls, isPlaying) {
        if (showControls && isPlaying) {
            delay(3500)
            showControls = false
        }
    }

    // 16:9 Aspect Ratio dimensions
    val pipWidthDp = 196.dp
    val pipHeightDp = 110.dp

    val configuration = LocalConfiguration.current
    val density = LocalDensity.current

    val screenWidthPx = with(density) { configuration.screenWidthDp.dp.toPx() }
    val screenHeightPx = with(density) { configuration.screenHeightDp.dp.toPx() }
    val pipWidthPx = with(density) { pipWidthDp.toPx() }
    val pipHeightPx = with(density) { pipHeightDp.toPx() }

    // Edge docking bounds (with safe padding from screen borders)
    val minX = with(density) { 12.dp.toPx() }
    val maxX = (screenWidthPx - pipWidthPx - with(density) { 12.dp.toPx() }).coerceAtLeast(minX)
    val minY = with(density) { 56.dp.toPx() } // safe from status bar
    val maxY = (screenHeightPx - pipHeightPx - with(density) { 88.dp.toPx() }).coerceAtLeast(minY) // above bottom nav / insets

    // Initial position: Bottom-right edge above bottom nav bar
    val initialX = maxX
    val initialY = (screenHeightPx - pipHeightPx - with(density) { 110.dp.toPx() }).coerceIn(minY, maxY)

    val offsetX = remember { Animatable(initialX) }
    val offsetY = remember { Animatable(initialY) }
    val pipScale = remember { Animatable(1.0f) }
    val pipAlpha = remember { Animatable(1.0f) }

    val isNearDismiss = offsetY.value > (screenHeightPx - pipHeightPx - with(density) { 100.dp.toPx() }) &&
        (offsetX.value + pipWidthPx / 2f) in (screenWidthPx * 0.22f)..(screenWidthPx * 0.78f)

    Box(modifier = modifier.fillMaxSize()) {
        // 1. Native-style Bottom Dismiss Zone Target (Visible while dragging)
        AnimatedVisibility(
            visible = isDraggingActive,
            enter = fadeIn(tween(150)) + scaleIn(initialScale = 0.8f),
            exit = fadeOut(tween(150)) + scaleOut(targetScale = 0.8f),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 60.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(28.dp),
                color = if (isNearDismiss) Color(0xFFEF4444) else Color(0xDD0F172A),
                border = BorderStroke(1.5.dp, if (isNearDismiss) Color.White else Color(0xFF334155)),
                shadowElevation = 12.dp,
                modifier = Modifier.scale(if (isNearDismiss) 1.15f else 1.0f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Dismiss",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isNearDismiss) "Release to Dismiss" else "Drag here to dismiss",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // 2. The Floating Native PiP Card
        Box(
            modifier = Modifier
                .offset { IntOffset(offsetX.value.roundToInt(), offsetY.value.roundToInt()) }
                .size(pipWidthDp, pipHeightDp)
                .scale(pipScale.value)
                .alpha(pipAlpha.value)
                .shadow(
                    elevation = 16.dp,
                    shape = RoundedCornerShape(16.dp),
                    spotColor = AppTheme.colors.primary,
                    ambientColor = Color.Black
                )
                .clip(RoundedCornerShape(16.dp))
                .background(Color.Black)
                .pointerInput(Unit) {
                    awaitEachGesture {
                        val down = awaitFirstDown(requireUnconsumed = false)
                        val downTime = System.currentTimeMillis()
                        val downPoint = down.position
                        val velocityTracker = VelocityTracker()
                        velocityTracker.addPosition(down.uptimeMillis, down.position)

                        var isDragging = false
                        val touchSlop = viewConfiguration.touchSlop

                        while (true) {
                            val event = awaitPointerEvent()
                            val change = event.changes.firstOrNull { it.id == down.id } ?: break

                            if (!change.pressed) {
                                // Pointer up (touch released)
                                val elapsed = System.currentTimeMillis() - downTime
                                val moveDistance = (change.position - downPoint).getDistance()

                                if (!isDragging && moveDistance < touchSlop && elapsed < 400) {
                                    // Clean tap detected (never swallowed by drag)
                                    val now = System.currentTimeMillis()
                                    if (now - lastTapTime < 320) {
                                        // Double tap -> expand to full player
                                        onExpand()
                                        lastTapTime = 0L
                                    } else {
                                        lastTapTime = now
                                        showControls = !showControls
                                    }
                                } else if (isDragging) {
                                    isDraggingActive = false
                                    val velocity = velocityTracker.calculateVelocity()
                                    val vx = velocity.x
                                    val vy = velocity.y

                                    val currentX = offsetX.value
                                    val currentY = offsetY.value

                                    val droppedInDismiss = currentY > (screenHeightPx - pipHeightPx - with(density) { 100.dp.toPx() }) &&
                                        (currentX + pipWidthPx / 2f) in (screenWidthPx * 0.22f)..(screenWidthPx * 0.78f)
                                    val flingDismiss = vy > 1300f

                                    if (droppedInDismiss || flingDismiss) {
                                        // Dismiss with smooth fling animation
                                        coroutineScope.launch {
                                            launch { pipScale.animateTo(0.1f, tween(180)) }
                                            launch { pipAlpha.animateTo(0f, tween(180)) }
                                            launch { offsetY.animateTo(screenHeightPx + 100f, tween(200)) }
                                            delay(200)
                                            playerManager.exoPlayer.pause()
                                            onClose()
                                        }
                                    } else {
                                        // Native Magnet Edge Snapping with Spring Physics
                                        val projectedX = currentX + (vx * 0.12f)
                                        val targetX = if (projectedX < (screenWidthPx - pipWidthPx) / 2f) minX else maxX
                                        val projectedY = (currentY + (vy * 0.12f)).coerceIn(minY, maxY)

                                        coroutineScope.launch {
                                            offsetX.animateTo(
                                                targetValue = targetX,
                                                animationSpec = spring(
                                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                                    stiffness = Spring.StiffnessMediumLow
                                                ),
                                                initialVelocity = vx
                                            )
                                        }
                                        coroutineScope.launch {
                                            offsetY.animateTo(
                                                targetValue = projectedY,
                                                animationSpec = spring(
                                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                                    stiffness = Spring.StiffnessMediumLow
                                                ),
                                                initialVelocity = vy
                                            )
                                        }
                                    }
                                }
                                break
                            } else {
                                velocityTracker.addPosition(change.uptimeMillis, change.position)
                                val totalMove = change.position - downPoint

                                if (!isDragging && (abs(totalMove.x) > touchSlop || abs(totalMove.y) > touchSlop)) {
                                    isDragging = true
                                    isDraggingActive = true
                                    coroutineScope.launch {
                                        offsetX.stop()
                                        offsetY.stop()
                                    }
                                }

                                if (isDragging) {
                                    val delta = change.positionChange()
                                    change.consume()
                                    coroutineScope.launch {
                                        offsetX.snapTo(offsetX.value + delta.x)
                                        offsetY.snapTo(offsetY.value + delta.y)
                                    }
                                }
                            }
                        }
                    }
                }
        ) {
            // A. Live ExoPlayer Surface
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        player = playerManager.exoPlayer
                        setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
                        setBackgroundColor(android.graphics.Color.BLACK)
                    }
                },
                update = { view ->
                    if (view.player != playerManager.exoPlayer) {
                        view.player = playerManager.exoPlayer
                    }
                },
                onRelease = { view ->
                    view.player = null
                },
                modifier = Modifier.fillMaxSize()
            )

            // B. Subtle Cyan Border Accent
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(
                        BorderStroke(1.5.dp, AppTheme.colors.primary.copy(alpha = 0.85f)),
                        RoundedCornerShape(16.dp)
                    )
            )

            // C. Bottom Progress Line (Always visible)
            val progressFraction = if (durationMs > 0L) {
                (currentPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
            } else {
                0f
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.5.dp)
                    .align(Alignment.BottomCenter)
                    .background(Color.White.copy(alpha = 0.25f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fraction = progressFraction)
                        .height(2.5.dp)
                        .background(AppTheme.colors.primary)
                )
            }

            // D. Native PiP Controls Overlay (Toggled via single tap, auto-hides after 3.5s)
            AnimatedVisibility(
                visible = showControls,
                enter = fadeIn(tween(150)),
                exit = fadeOut(tween(150)),
                modifier = Modifier.fillMaxSize()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.58f))
                ) {
                    // Top Bar: Maximize on Left, Title in Center, Close on Right
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopCenter)
                            .padding(horizontal = 6.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Maximize / Expand Button
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.65f))
                                .clickable { onExpand() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.OpenInFull,
                                contentDescription = "Expand Fullscreen",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }

                        // Title Text
                        Text(
                            text = lesson.title,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 6.dp)
                        )

                        // Close Button
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.65f))
                                .clickable {
                                    playerManager.exoPlayer.pause()
                                    onClose()
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close PiP",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }

                    // Center Play / Pause Button
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .align(Alignment.Center)
                            .clip(CircleShape)
                            .background(AppTheme.colors.primaryButton.copy(alpha = 0.9f))
                            .clickable {
                                playerManager.togglePlayPause()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = Color.White,
                            modifier = Modifier.size(26.dp)
                        )
                    }

                    // Bottom Timestamp Badge
                    Text(
                        text = "${formatTime(currentPositionMs)} / ${formatTime(durationMs)}",
                        color = Color(0xFFCBD5E1),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(start = 8.dp, bottom = 6.dp)
                    )
                }
            }
        }
    }
}

private fun formatTime(millis: Long): String {
    if (millis <= 0L) return "00:00"
    val totalSeconds = millis / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%02d:%02d", minutes, seconds)
}
