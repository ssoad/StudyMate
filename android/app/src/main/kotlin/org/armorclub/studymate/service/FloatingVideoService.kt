package org.armorclub.studymate.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.core.app.NotificationCompat
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import org.armorclub.studymate.MainActivity
import org.armorclub.studymate.player.PlayerManager

class FloatingVideoService : Service() {

    companion object {
        const val CHANNEL_ID = "studymate_floating_video"
        const val NOTIFICATION_ID = 1001

        const val EXTRA_COURSE_ID = "extra_course_id"
        const val EXTRA_LESSON_ID = "extra_lesson_id"
        const val EXTRA_LESSON_TITLE = "extra_lesson_title"

        fun start(context: Context, courseId: String, lessonId: String, lessonTitle: String) {
            val intent = Intent(context, FloatingVideoService::class.java).apply {
                putExtra(EXTRA_COURSE_ID, courseId)
                putExtra(EXTRA_LESSON_ID, lessonId)
                putExtra(EXTRA_LESSON_TITLE, lessonTitle)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, FloatingVideoService::class.java)
            context.stopService(intent)
        }
    }

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var courseId: String = ""
    private var lessonId: String = ""
    private var lessonTitle: String = ""

    override fun onBind(intent: Intent?): IBinder? = null

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    @OptIn(UnstableApi::class)
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        courseId = intent?.getStringExtra(EXTRA_COURSE_ID) ?: courseId
        lessonId = intent?.getStringExtra(EXTRA_LESSON_ID) ?: lessonId
        lessonTitle = intent?.getStringExtra(EXTRA_LESSON_TITLE) ?: lessonTitle

        val notification = buildNotification(lessonTitle)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        showFloatingWindow()

        return START_NOT_STICKY
    }

    @OptIn(UnstableApi::class)
    @SuppressLint("ClickableViewAccessibility")
    private fun showFloatingWindow() {
        if (floatingView != null) return

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val displayMetrics = resources.displayMetrics
        val width = (displayMetrics.widthPixels * 0.65f).toInt().coerceIn(400, 800)
        val height = (width * 9) / 16 // 16:9 ratio

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            width,
            height,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = displayMetrics.widthPixels - width - 40
            y = 200
        }

        // Build floating container
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        val playerView = PlayerView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            useController = false
            player = PlayerManager.getInstance(applicationContext).exoPlayer
        }
        rootLayout.addView(playerView)

        // Overlay control bar on top
        val controlsOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#99000000"))
            setPadding(16, 8, 16, 8)
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.TOP
            )
        }

        val titleView = TextView(this).apply {
            text = lessonTitle.ifBlank { "StudyMate Player" }
            setTextColor(Color.WHITE)
            textSize = 11f
            maxLines = 1
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        controlsOverlay.addView(titleView)

        // Play / Pause toggle
        val playPauseBtn = ImageButton(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(16, 16, 16, 16)
            val isPlaying = PlayerManager.getInstance(applicationContext).exoPlayer.isPlaying
            setImageResource(if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
            setColorFilter(Color.WHITE)
            setOnClickListener {
                val pm = PlayerManager.getInstance(applicationContext)
                pm.togglePlayPause()
                setImageResource(if (pm.exoPlayer.isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
            }
        }
        controlsOverlay.addView(playPauseBtn)

        // Fullscreen return button
        val expandBtn = ImageButton(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(16, 16, 16, 16)
            setImageResource(android.R.drawable.ic_menu_crop)
            setColorFilter(Color.WHITE)
            setOnClickListener {
                returnToApp()
            }
        }
        controlsOverlay.addView(expandBtn)

        // Close button
        val closeBtn = ImageButton(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(16, 16, 16, 16)
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            setColorFilter(Color.WHITE)
            setOnClickListener {
                stopSelf()
            }
        }
        controlsOverlay.addView(closeBtn)

        rootLayout.addView(controlsOverlay)

        // Drag listener for moving floating window
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isMoving = false

        val dragTouchListener = View.OnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isMoving = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isMoving = true
                    }
                    params.x = initialX + dx
                    params.y = initialY + dy
                    windowManager?.updateViewLayout(rootLayout, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isMoving) {
                        // Toggle control overlay visibility on click
                        controlsOverlay.visibility = if (controlsOverlay.visibility == View.VISIBLE) View.GONE else View.VISIBLE
                    }
                    true
                }
                else -> false
            }
        }

        playerView.setOnTouchListener(dragTouchListener)
        titleView.setOnTouchListener(dragTouchListener)

        floatingView = rootLayout
        windowManager?.addView(floatingView, params)
    }

    private fun returnToApp() {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_COURSE_ID, courseId)
            putExtra(EXTRA_LESSON_ID, lessonId)
        }
        startActivity(intent)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "StudyMate Floating Player",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows active playback while floating over other apps"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String): Notification {
        val returnIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_COURSE_ID, courseId)
            putExtra(EXTRA_LESSON_ID, lessonId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            returnIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Playing: $title")
            .setContentText("Tap to return to StudyMate")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        floatingView?.let {
            windowManager?.removeView(it)
            floatingView = null
        }
    }
}
