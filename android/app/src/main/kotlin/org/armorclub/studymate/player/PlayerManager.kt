package org.armorclub.studymate.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.ui.PlayerNotificationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.armorclub.studymate.MainActivity
import org.armorclub.studymate.data.model.CourseLesson
import org.armorclub.studymate.service.FloatingVideoService
import java.io.File

@OptIn(UnstableApi::class)
class PlayerManager private constructor(context: Context) {

    companion object {
        @Volatile
        private var instance: PlayerManager? = null

        fun getInstance(context: Context): PlayerManager {
            return instance ?: synchronized(this) {
                instance ?: PlayerManager(context.applicationContext).also { instance = it }
            }
        }

        private var simpleCache: SimpleCache? = null

        @Synchronized
        fun getCache(context: Context): SimpleCache {
            if (simpleCache == null) {
                val cacheDir = File(context.cacheDir, VIDEO_CACHE_DIR)
                val evictor = LeastRecentlyUsedCacheEvictor(256 * 1024 * 1024) // 256MB cache
                simpleCache = SimpleCache(cacheDir, evictor)
            }
            return simpleCache!!
        }

        private const val VIDEO_CACHE_DIR = "studymate_video_cache"

        /** Bytes used by the video cache plus other temporary files. Call off the main thread. */
        fun cacheSizeBytes(context: Context): Long {
            val video = getCache(context).cacheSpace
            val other = context.cacheDir.listFiles().orEmpty()
                .filter { it.name != VIDEO_CACHE_DIR }
                .sumOf { f -> f.walkTopDown().filter { it.isFile }.sumOf { it.length() } }
            return video + other
        }

        /**
         * Empties caches without deleting the live SimpleCache directory underneath it
         * (doing that corrupts the cache index). Call off the main thread.
         */
        fun clearCaches(context: Context) {
            val cache = getCache(context)
            cache.keys.toList().forEach { key ->
                runCatching { cache.removeResource(key) }
            }
            context.cacheDir.listFiles().orEmpty()
                .filter { it.name != VIDEO_CACHE_DIR }
                .forEach { it.deleteRecursively() }
        }
    }

    private val appContext = context.applicationContext
    val exoPlayer: ExoPlayer

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _currentPositionMs = MutableStateFlow(0L)
    val currentPositionMs: StateFlow<Long> = _currentPositionMs.asStateFlow()

    private val _durationMs = MutableStateFlow(0L)
    val durationMs: StateFlow<Long> = _durationMs.asStateFlow()

    private val _bufferedPositionMs = MutableStateFlow(0L)
    val bufferedPositionMs: StateFlow<Long> = _bufferedPositionMs.asStateFlow()

    private val _playbackSpeed = MutableStateFlow(1.0f)
    val playbackSpeed: StateFlow<Float> = _playbackSpeed.asStateFlow()

    private val _activeLesson = MutableStateFlow<CourseLesson?>(null)
    val activeLesson: StateFlow<CourseLesson?> = _activeLesson.asStateFlow()

    private val _activeCourseId = MutableStateFlow<String?>(null)
    val activeCourseId: StateFlow<String?> = _activeCourseId.asStateFlow()

    private val _onPlaybackEnded = MutableSharedFlow<CourseLesson>(extraBufferCapacity = 1)
    val onPlaybackEnded: SharedFlow<CourseLesson> = _onPlaybackEnded.asSharedFlow()

    private val coroutineScope = CoroutineScope(Dispatchers.Main + Job())
    private var progressJob: Job? = null

    private var playerNotificationManager: PlayerNotificationManager? = null
    private var mediaSession: MediaSession? = null

    init {
        // High performance load control for instant playback start
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                /* minBufferMs = */ 15_000,
                /* maxBufferMs = */ 60_000,
                /* bufferForPlaybackMs = */ 500, // starts playing in 500ms
                /* bufferForPlaybackAfterRebufferMs = */ 1000
            )
            .setPrioritizeTimeOverSizeThresholds(true)
            .build()

        // Hardware-accelerated decoder factory
        val renderersFactory = DefaultRenderersFactory(appContext).apply {
            setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            setEnableDecoderFallback(true)
        }

        // CacheDataSource for caching video bytes locally
        val upstreamFactory = DefaultDataSource.Factory(appContext)
        val cacheDataSourceFactory = CacheDataSource.Factory()
            .setCache(getCache(appContext))
            .setUpstreamDataSourceFactory(upstreamFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)

        val mediaSourceFactory = DefaultMediaSourceFactory(cacheDataSourceFactory)

        exoPlayer = ExoPlayer.Builder(appContext, renderersFactory)
            .setLoadControl(loadControl)
            .setMediaSourceFactory(mediaSourceFactory)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()

        exoPlayer.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                _isPlaying.value = playing
                if (playing) {
                    startProgressPolling()
                } else {
                    stopProgressPolling()
                }
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    _durationMs.value = exoPlayer.duration.coerceAtLeast(0L)
                } else if (playbackState == Player.STATE_ENDED) {
                    _activeLesson.value?.let { lesson ->
                        _onPlaybackEnded.tryEmit(lesson)
                    }
                }
            }
        })

        setupNotificationAndMediaSession()
    }

    private fun setupNotificationAndMediaSession() {
        val channelId = "studymate_media_playback"
        val notificationId = 2002

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "StudyMate Video Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Media controls and playback status for StudyMate course lectures"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }

        val sessionIntent = Intent(appContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val sessionPendingIntent = PendingIntent.getActivity(
            appContext,
            0,
            sessionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSession.Builder(appContext, exoPlayer)
            .setId("StudyMateMediaSession")
            .setSessionActivity(sessionPendingIntent)
            .build()

        playerNotificationManager = PlayerNotificationManager.Builder(
            appContext,
            notificationId,
            channelId
        )
            .setMediaDescriptionAdapter(object : PlayerNotificationManager.MediaDescriptionAdapter {
                override fun getCurrentContentTitle(player: Player): CharSequence {
                    return _activeLesson.value?.title ?: "StudyMate Video Lecture"
                }

                override fun createCurrentContentIntent(player: Player): PendingIntent? {
                    val intent = Intent(appContext, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        _activeCourseId.value?.let { putExtra(FloatingVideoService.EXTRA_COURSE_ID, it) }
                        _activeLesson.value?.id?.let { putExtra(FloatingVideoService.EXTRA_LESSON_ID, it) }
                    }
                    return PendingIntent.getActivity(
                        appContext,
                        101,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                }

                override fun getCurrentContentText(player: Player): CharSequence? {
                    return "Complexity IT • AD (ICT) Master Course"
                }

                override fun getCurrentLargeIcon(
                    player: Player,
                    callback: PlayerNotificationManager.BitmapCallback
                ): Bitmap? {
                    return null
                }
            })
            .setNotificationListener(object : PlayerNotificationManager.NotificationListener {
                override fun onNotificationPosted(notificationId: Int, notification: Notification, ongoing: Boolean) {
                }

                override fun onNotificationCancelled(notificationId: Int, dismissedByUser: Boolean) {
                }
            })
            .setSmallIconResourceId(android.R.drawable.ic_media_play)
            .build().apply {
                setMediaSessionToken(mediaSession!!.platformToken)
                setUseRewindAction(true)
                setUseFastForwardAction(true)
                setUseNextAction(false)
                setUsePreviousAction(false)
                setPlayer(exoPlayer)
            }
    }

    fun playLesson(courseId: String, lesson: CourseLesson, videoUrl: String, startPositionMs: Long = 0L) {
        if (_activeLesson.value?.id == lesson.id && exoPlayer.playbackState != Player.STATE_IDLE) {
            if (!exoPlayer.isPlaying) exoPlayer.play()
            return
        }

        _activeCourseId.value = courseId
        _activeLesson.value = lesson

        val mediaMetadata = MediaMetadata.Builder()
            .setTitle(lesson.title)
            .setArtist("Complexity IT • AD ICT Master Course")
            .setDisplayTitle(lesson.title)
            .build()

        val mediaItem = MediaItem.Builder()
            .setUri(Uri.parse(videoUrl))
            .setMediaId(lesson.id)
            .setMediaMetadata(mediaMetadata)
            .build()

        exoPlayer.setMediaItem(mediaItem, startPositionMs)
        exoPlayer.prepare()
        exoPlayer.play()

        playerNotificationManager?.invalidate()
    }

    fun togglePlayPause() {
        if (exoPlayer.isPlaying) {
            exoPlayer.pause()
        } else {
            exoPlayer.play()
        }
    }

    fun pause() {
        exoPlayer.pause()
    }

    fun stop() {
        exoPlayer.stop()
    }

    fun seekTo(positionMs: Long) {
        val safePos = positionMs.coerceIn(0L, exoPlayer.duration.coerceAtLeast(0L))
        exoPlayer.seekTo(safePos)
        _currentPositionMs.value = safePos
    }

    fun seekBy(deltaMs: Long) {
        val current = exoPlayer.currentPosition
        seekTo(current + deltaMs)
    }

    fun setSpeed(speed: Float) {
        _playbackSpeed.value = speed
        exoPlayer.playbackParameters = PlaybackParameters(speed)
    }

    private fun startProgressPolling() {
        progressJob?.cancel()
        progressJob = coroutineScope.launch {
            while (isActive) {
                _currentPositionMs.value = exoPlayer.currentPosition.coerceAtLeast(0L)
                _durationMs.value = exoPlayer.duration.coerceAtLeast(0L)
                _bufferedPositionMs.value = exoPlayer.bufferedPosition.coerceAtLeast(0L)
                delay(250)
            }
        }
    }

    private fun stopProgressPolling() {
        progressJob?.cancel()
        _currentPositionMs.value = exoPlayer.currentPosition.coerceAtLeast(0L)
    }

    fun release() {
        stopProgressPolling()
        playerNotificationManager?.setPlayer(null)
        playerNotificationManager = null
        mediaSession?.release()
        mediaSession = null
        exoPlayer.release()
    }
}
