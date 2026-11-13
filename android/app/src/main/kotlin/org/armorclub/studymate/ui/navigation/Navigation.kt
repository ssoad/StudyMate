package org.armorclub.studymate.ui.navigation

import android.app.Activity
import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import org.armorclub.studymate.R
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.data.repository.ThemeMode
import org.armorclub.studymate.data.repository.ThemeRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.theme.AppTheme
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.filled.BrightnessAuto
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import org.armorclub.studymate.ui.components.InAppPictureInPicture
import org.armorclub.studymate.ui.screens.CourseDetailScreen
import org.armorclub.studymate.ui.screens.CourseListScreen
import org.armorclub.studymate.ui.screens.DocumentReaderScreen
import org.armorclub.studymate.ui.screens.FullScreenNotesScreen
import org.armorclub.studymate.ui.screens.LessonPlayerScreen
import org.armorclub.studymate.ui.screens.MyLearningScreen
import org.armorclub.studymate.ui.screens.ProfileScreen
import org.armorclub.studymate.ui.screens.ResourcesScreen
import org.armorclub.studymate.ui.screens.SettingsScreen
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

sealed class Screen(val route: String) {
    data object MainContainer : Screen("main_container")

    data object CourseDetail : Screen("course_detail/{courseId}") {
        fun createRoute(courseId: String) = "course_detail/$courseId"
    }

    data object LessonPlayer : Screen("lesson_player/{courseId}/{lessonId}") {
        fun createRoute(courseId: String, lessonId: String) = "lesson_player/$courseId/$lessonId"
    }

    data object FullScreenNotes : Screen("fullscreen_notes/{courseId}/{lessonId}/{lessonTitle}/{courseTitle}") {
        fun createRoute(courseId: String, lessonId: String, lessonTitle: String, courseTitle: String): String {
            val encLesson = URLEncoder.encode(lessonTitle, StandardCharsets.UTF_8.toString())
            val encCourse = URLEncoder.encode(courseTitle, StandardCharsets.UTF_8.toString())
            return "fullscreen_notes/$courseId/$lessonId/$encLesson/$encCourse"
        }
    }

    data object DocumentReader : Screen("document_reader/{title}/{fileUrl}") {
        fun createRoute(title: String, fileUrl: String): String {
            val encTitle = android.util.Base64.encodeToString(title.toByteArray(StandardCharsets.UTF_8), android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP)
            val encUrl = android.util.Base64.encodeToString(fileUrl.toByteArray(StandardCharsets.UTF_8), android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP)
            return "document_reader/$encTitle/$encUrl"
        }
    }

    data object Settings : Screen("settings")
}

@Composable
fun AppNavigation(
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    notesRepository: NotesRepository,
    progressRepository: ProgressRepository,
    enrollmentRepository: EnrollmentRepository,
    playerManager: PlayerManager,
    themeRepository: ThemeRepository,
    initialCourseId: String? = null,
    initialLessonId: String? = null
) {
    val navController = rememberNavController()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val startDestination = Screen.MainContainer.route

    androidx.compose.runtime.LaunchedEffect(initialCourseId, initialLessonId) {
        if (initialCourseId != null && initialLessonId != null) {
            navController.navigate(Screen.LessonPlayer.createRoute(initialCourseId, initialLessonId))
        }
    }

    fun enterPiP() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val activity = context as? Activity
            val aspectRatio = Rational(16, 9)
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(aspectRatio)
                .build()
            activity?.enterPictureInPictureMode(params)
        }
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isPlayerScreen = currentRoute?.startsWith("lesson_player") == true

    val activeLesson by playerManager.activeLesson.collectAsState()
    val activeCourseId by playerManager.activeCourseId.collectAsState()
    val isPlaying by playerManager.isPlaying.collectAsState()
    // Only "has any progress" matters here; collecting the raw position would
    // recompose the whole app 4x per second during playback.
    val hasPlaybackProgress by remember(playerManager) {
        playerManager.currentPositionMs.map { it > 0L }.distinctUntilChanged()
    }.collectAsState(initial = false)

    var isPipDismissed by rememberSaveable { mutableStateOf(false) }

    // Reset dismissed state whenever user selects or changes lesson
    androidx.compose.runtime.LaunchedEffect(activeLesson?.id) {
        if (activeLesson != null) {
            isPipDismissed = false
        }
    }

    // Auto-dismiss when playback ends
    androidx.compose.runtime.LaunchedEffect(Unit) {
        playerManager.onPlaybackEnded.collect {
            isPipDismissed = true
        }
    }

    val showInAppPiP = activeLesson != null && !isPlayerScreen && !isPipDismissed && (isPlaying || hasPlaybackProgress)

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(
            navController = navController,
            startDestination = startDestination,
        enterTransition = {
            slideInHorizontally(
                initialOffsetX = { (it * 0.18f).toInt() },
                animationSpec = tween(220, easing = FastOutSlowInEasing)
            ) + fadeIn(animationSpec = tween(200, easing = LinearOutSlowInEasing))
        },
        exitTransition = {
            slideOutHorizontally(
                targetOffsetX = { -(it * 0.10f).toInt() },
                animationSpec = tween(200, easing = FastOutSlowInEasing)
            ) + fadeOut(animationSpec = tween(180, easing = FastOutLinearInEasing))
        },
        popEnterTransition = {
            slideInHorizontally(
                initialOffsetX = { -(it * 0.10f).toInt() },
                animationSpec = tween(200, easing = FastOutSlowInEasing)
            ) + fadeIn(animationSpec = tween(200, easing = LinearOutSlowInEasing))
        },
        popExitTransition = {
            slideOutHorizontally(
                targetOffsetX = { (it * 0.18f).toInt() },
                animationSpec = tween(220, easing = FastOutSlowInEasing)
            ) + fadeOut(animationSpec = tween(180, easing = FastOutLinearInEasing))
        }
    ) {
        composable(Screen.MainContainer.route) {
            MainShell(
                navController = navController,
                courseRepository = courseRepository,
                authRepository = authRepository,
                progressRepository = progressRepository,
                enrollmentRepository = enrollmentRepository,
                playerManager = playerManager,
                themeRepository = themeRepository
            )
        }

        // Settings Screen
        composable(Screen.Settings.route) {
            SettingsScreen(
                courseRepository = courseRepository,
                playerManager = playerManager,
                themeRepository = themeRepository,
                onBackClick = { navController.popBackStack() }
            )
        }

        // Course Detail / Syllabus Screen
        composable(
            route = Screen.CourseDetail.route,
            arguments = listOf(navArgument("courseId") { type = NavType.StringType })
        ) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getString("courseId") ?: ""
            CourseDetailScreen(
                courseId = courseId,
                courseRepository = courseRepository,
                authRepository = authRepository,
                progressRepository = progressRepository,
                enrollmentRepository = enrollmentRepository,
                onBackClick = { navController.popBackStack() },
                onSelectLesson = { cId, lessonId ->
                    navController.navigate(Screen.LessonPlayer.createRoute(cId, lessonId))
                },
                onViewResource = { title, fileUrl ->
                    navController.navigate(Screen.DocumentReader.createRoute(title, fileUrl))
                }
            )
        }

        // Lesson Player Screen (with Resources, Notes, Syllabus, Overview tabs)
        composable(
            route = Screen.LessonPlayer.route,
            arguments = listOf(
                navArgument("courseId") { type = NavType.StringType },
                navArgument("lessonId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getString("courseId") ?: ""
            val lessonId = backStackEntry.arguments?.getString("lessonId") ?: ""

            LessonPlayerScreen(
                courseId = courseId,
                lessonId = lessonId,
                courseRepository = courseRepository,
                notesRepository = notesRepository,
                progressRepository = progressRepository,
                authRepository = authRepository,
                enrollmentRepository = enrollmentRepository,
                playerManager = playerManager,
                onBackClick = { navController.popBackStack() },
                onSelectLesson = { newLessonId ->
                    navController.navigate(Screen.LessonPlayer.createRoute(courseId, newLessonId)) {
                        popUpTo(Screen.LessonPlayer.route) { inclusive = true }
                    }
                },
                onOpenFullScreenNotes = { cId, lId, lTitle, cTitle ->
                    navController.navigate(Screen.FullScreenNotes.createRoute(cId, lId, lTitle, cTitle))
                },
                onViewResource = { title, fileUrl ->
                    navController.navigate(Screen.DocumentReader.createRoute(title, fileUrl))
                },
                onPiPClick = { enterPiP() }
            )
        }

        // Full Screen Notes Workspace
        composable(
            route = Screen.FullScreenNotes.route,
            arguments = listOf(
                navArgument("courseId") { type = NavType.StringType },
                navArgument("lessonId") { type = NavType.StringType },
                navArgument("lessonTitle") { type = NavType.StringType },
                navArgument("courseTitle") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getString("courseId") ?: ""
            val lessonId = backStackEntry.arguments?.getString("lessonId") ?: ""
            val rawLessonTitle = backStackEntry.arguments?.getString("lessonTitle") ?: ""
            val rawCourseTitle = backStackEntry.arguments?.getString("courseTitle") ?: ""

            val lessonTitle = try {
                URLDecoder.decode(rawLessonTitle, StandardCharsets.UTF_8.toString())
            } catch (e: Exception) {
                rawLessonTitle
            }

            val courseTitle = try {
                URLDecoder.decode(rawCourseTitle, StandardCharsets.UTF_8.toString())
            } catch (e: Exception) {
                rawCourseTitle
            }

            FullScreenNotesScreen(
                courseId = courseId,
                lessonId = lessonId,
                lessonTitle = lessonTitle,
                courseTitle = courseTitle,
                notesRepository = notesRepository,
                playerManager = playerManager,
                onBackClick = { navController.popBackStack() }
            )
        }

        // Native Hardware-Accelerated PDF & Document Reader
        composable(
            route = Screen.DocumentReader.route,
            arguments = listOf(
                navArgument("title") { type = NavType.StringType },
                navArgument("fileUrl") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val encTitle = backStackEntry.arguments?.getString("title") ?: ""
            val encUrl = backStackEntry.arguments?.getString("fileUrl") ?: ""

            val title = try {
                val decodedBytes = android.util.Base64.decode(encTitle, android.util.Base64.URL_SAFE)
                String(decodedBytes, StandardCharsets.UTF_8)
            } catch (e: Exception) {
                encTitle
            }

            val fileUrl = try {
                val decodedBytes = android.util.Base64.decode(encUrl, android.util.Base64.URL_SAFE)
                String(decodedBytes, StandardCharsets.UTF_8)
            } catch (e: Exception) {
                encUrl
            }

            DocumentReaderScreen(
                title = title,
                fileUrl = fileUrl,
                courseRepository = courseRepository,
                onBackClick = { navController.popBackStack() }
            )
        }
    }

        // In-App Picture-in-Picture Overlay (visible on every screen unless user is on LessonPlayerScreen)
        if (showInAppPiP) {
            InAppPictureInPicture(
                playerManager = playerManager,
                onExpand = {
                    val cId = activeCourseId ?: ""
                    val lId = activeLesson?.id ?: ""
                    if (cId.isNotBlank() && lId.isNotBlank()) {
                        navController.navigate(Screen.LessonPlayer.createRoute(cId, lId))
                    }
                },
                onClose = {
                    isPipDismissed = true
                }
            )
        }
    }
}
