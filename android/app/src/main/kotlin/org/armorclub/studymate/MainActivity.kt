package org.armorclub.studymate

import android.Manifest
import android.app.PictureInPictureParams
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.data.repository.ThemeMode
import org.armorclub.studymate.data.repository.ThemeRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.service.FloatingVideoService
import org.armorclub.studymate.ui.navigation.AppNavigation
import org.armorclub.studymate.ui.theme.StudyMateTheme

class MainActivity : ComponentActivity() {

    private lateinit var courseRepository: CourseRepository
    private lateinit var authRepository: AuthRepository
    private lateinit var notesRepository: NotesRepository
    private lateinit var progressRepository: ProgressRepository
    private lateinit var playerManager: PlayerManager
    private lateinit var themeRepository: ThemeRepository

    private var initialCourseId by mutableStateOf<String?>(null)
    private var initialLessonId by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        courseRepository = CourseRepository(this)
        authRepository = AuthRepository(this, courseRepository)
        notesRepository = NotesRepository(this)
        progressRepository = ProgressRepository(this, courseRepository, authRepository)
        playerManager = PlayerManager.getInstance(this)
        themeRepository = ThemeRepository(this)

        handleIntent(intent)
        checkNotificationPermission()
        setupPictureInPicture()
        observePlaybackForPictureInPicture()

        enableEdgeToEdge()
        setContent {
            val themeMode by themeRepository.themeMode.collectAsState()
            val isSystemDark = isSystemInDarkTheme()
            val isDark = when (themeMode) {
                ThemeMode.AMOLED_DARK -> true
                ThemeMode.LIGHT -> false
                ThemeMode.SYSTEM -> isSystemDark
            }

            StudyMateTheme(isDark = isDark) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(
                        courseRepository = courseRepository,
                        authRepository = authRepository,
                        notesRepository = notesRepository,
                        progressRepository = progressRepository,
                        playerManager = playerManager,
                        themeRepository = themeRepository,
                        initialCourseId = initialCourseId,
                        initialLessonId = initialLessonId
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val cId = intent?.getStringExtra(FloatingVideoService.EXTRA_COURSE_ID)
            ?: intent?.getStringExtra("course_id")
        val lId = intent?.getStringExtra(FloatingVideoService.EXTRA_LESSON_ID)
            ?: intent?.getStringExtra("lesson_id")
        if (!cId.isNullOrBlank() && !lId.isNullOrBlank()) {
            initialCourseId = cId
            initialLessonId = lId
        }
    }

    private fun checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
    }

    private fun setupPictureInPicture() {
        updatePictureInPictureParams(false)
    }

    private fun observePlaybackForPictureInPicture() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                playerManager.isPlaying.collect { isPlaying ->
                    updatePictureInPictureParams(isPlaying)
                }
            }
        }
    }

    private fun updatePictureInPictureParams(isPlaying: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val params = PictureInPictureParams.Builder()
                .setAutoEnterEnabled(isPlaying) // Only auto-enter PiP when video is actively playing!
                .setAspectRatio(Rational(16, 9))
                .build()
            setPictureInPictureParams(params)
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (playerManager.exoPlayer.isPlaying) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
            }
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        // PiP mode state handling
    }
}
