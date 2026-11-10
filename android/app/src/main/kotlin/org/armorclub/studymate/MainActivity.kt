package org.armorclub.studymate

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.service.FloatingVideoService
import org.armorclub.studymate.ui.navigation.AppNavigation
import org.armorclub.studymate.ui.theme.StudyMateTheme

class MainActivity : ComponentActivity() {

    private lateinit var courseRepository: CourseRepository
    private lateinit var authRepository: AuthRepository
    private lateinit var notesRepository: NotesRepository
    private lateinit var playerManager: PlayerManager

    private var initialCourseId by mutableStateOf<String?>(null)
    private var initialLessonId by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        courseRepository = CourseRepository(this)
        authRepository = AuthRepository(this, courseRepository)
        notesRepository = NotesRepository(this)
        playerManager = PlayerManager.getInstance(this)

        handleIntent(intent)
        setupPictureInPicture()

        enableEdgeToEdge()
        setContent {
            StudyMateTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(
                        courseRepository = courseRepository,
                        authRepository = authRepository,
                        notesRepository = notesRepository,
                        playerManager = playerManager,
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
        val lId = intent?.getStringExtra(FloatingVideoService.EXTRA_LESSON_ID)
        if (!cId.isNullOrBlank() && !lId.isNullOrBlank()) {
            initialCourseId = cId
            initialLessonId = lId
        }
    }

    private fun setupPictureInPicture() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val params = PictureInPictureParams.Builder()
                .setAutoEnterEnabled(true)
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
