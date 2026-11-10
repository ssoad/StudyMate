package org.armorclub.studymate.ui.navigation

import android.app.Activity
import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.screens.CourseDetailScreen
import org.armorclub.studymate.ui.screens.CourseListScreen
import org.armorclub.studymate.ui.screens.DocumentReaderScreen
import org.armorclub.studymate.ui.screens.FullScreenNotesScreen
import org.armorclub.studymate.ui.screens.LessonPlayerScreen
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
    playerManager: PlayerManager,
    initialCourseId: String? = null,
    initialLessonId: String? = null
) {
    val navController = rememberNavController()
    val context = LocalContext.current

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

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Main Container Screen with Bottom Navigation Bar
        composable(Screen.MainContainer.route) {
            var selectedBottomNav by remember { mutableIntStateOf(0) }

            Scaffold(
                bottomBar = {
                    NavigationBar(
                        containerColor = Color(0xFF0F172A)
                    ) {
                        NavigationBarItem(
                            selected = selectedBottomNav == 0,
                            onClick = { selectedBottomNav = 0 },
                            icon = { Icon(Icons.Default.School, contentDescription = "Courses") },
                            label = { Text("Courses") },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color.White,
                                selectedTextColor = Color(0xFF38BDF8),
                                indicatorColor = Color(0xFF0284C7),
                                unselectedIconColor = Color(0xFF64748B),
                                unselectedTextColor = Color(0xFF64748B)
                            )
                        )
                        NavigationBarItem(
                            selected = selectedBottomNav == 1,
                            onClick = { selectedBottomNav = 1 },
                            icon = { Icon(Icons.Default.Book, contentDescription = "Resources") },
                            label = { Text("Resources") },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color.White,
                                selectedTextColor = Color(0xFF38BDF8),
                                indicatorColor = Color(0xFF0284C7),
                                unselectedIconColor = Color(0xFF64748B),
                                unselectedTextColor = Color(0xFF64748B)
                            )
                        )
                        NavigationBarItem(
                            selected = selectedBottomNav == 2,
                            onClick = { selectedBottomNav = 2 },
                            icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                            label = { Text("Profile") },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color.White,
                                selectedTextColor = Color(0xFF38BDF8),
                                indicatorColor = Color(0xFF0284C7),
                                unselectedIconColor = Color(0xFF64748B),
                                unselectedTextColor = Color(0xFF64748B)
                            )
                        )
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    when (selectedBottomNav) {
                        0 -> CourseListScreen(
                            courseRepository = courseRepository,
                            authRepository = authRepository,
                            playerManager = playerManager,
                            onCourseClick = { courseId ->
                                navController.navigate(Screen.CourseDetail.createRoute(courseId))
                            },
                            onResumeLessonClick = { courseId, lessonId ->
                                navController.navigate(Screen.LessonPlayer.createRoute(courseId, lessonId))
                            },
                            onProfileClick = {
                                selectedBottomNav = 2
                            }
                        )
                        1 -> ResourcesScreen(
                            courseRepository = courseRepository,
                            onViewResource = { title, fileUrl ->
                                navController.navigate(Screen.DocumentReader.createRoute(title, fileUrl))
                            },
                            onCourseClick = { courseId ->
                                navController.navigate(Screen.CourseDetail.createRoute(courseId))
                            }
                        )
                        2 -> ProfileScreen(
                            authRepository = authRepository,
                            courseRepository = courseRepository,
                            onNavigateToSettings = {
                                navController.navigate(Screen.Settings.route)
                            },
                            onSelectCourse = { courseId ->
                                navController.navigate(Screen.CourseDetail.createRoute(courseId))
                            }
                        )
                    }
                }
            }
        }

        // Settings Screen
        composable(Screen.Settings.route) {
            SettingsScreen(
                courseRepository = courseRepository,
                playerManager = playerManager,
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
}
