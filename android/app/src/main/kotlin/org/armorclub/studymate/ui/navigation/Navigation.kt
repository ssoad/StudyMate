package org.armorclub.studymate.ui.navigation

import android.app.Activity
import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.NotesRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.player.PlayerManager
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
    playerManager: PlayerManager,
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

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Main Container Screen with Navigation Drawer & 4 Bottom Navigation Tabs
        composable(Screen.MainContainer.route) {
            var selectedBottomNav by remember { mutableIntStateOf(0) }
            val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

            val currentUser by authRepository.currentUser.collectAsState()
            val isLoggedIn by authRepository.isLoggedIn.collectAsState()

            // State for Web Feature dialogs accessible from menu
            var showExamsDialog by remember { mutableStateOf(false) }
            var showLeaderboardDialog by remember { mutableStateOf(false) }
            var showDiscussionDialog by remember { mutableStateOf(false) }

            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    ModalDrawerSheet(
                        drawerContainerColor = Color(0xFF0F172A),
                        drawerContentColor = Color.White
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp)
                        ) {
                            // DRAWER HEADER: Student Profile Info
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 8.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(
                                        Brush.linearGradient(
                                            listOf(Color(0xFF1E1B4B), Color(0xFF0284C7))
                                        )
                                    )
                                    .padding(16.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(50.dp)
                                            .clip(CircleShape)
                                            .background(Color.White.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (currentUser != null) {
                                            Text(
                                                text = currentUser!!.fullName.take(1).uppercase().ifBlank { "U" },
                                                color = Color.White,
                                                fontSize = 20.sp,
                                                fontWeight = FontWeight.Black
                                            )
                                        } else {
                                            Icon(
                                                Icons.Default.Person,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.width(14.dp))

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = currentUser?.fullName ?: "StudyMate Student",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                        Text(
                                            text = currentUser?.email ?: "Sign in to sync your progress",
                                            color = Color(0xFF94A3B8),
                                            fontSize = 11.sp
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Surface(
                                            color = Color(0xFF10B981).copy(alpha = 0.25f),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = if (isLoggedIn) "PRO MEMBER" else "GUEST ACCESS",
                                                color = Color(0xFF10B981),
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Black,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                            HorizontalDivider(color = Color(0xFF1E293B))
                            Spacer(modifier = Modifier.height(8.dp))

                            // MENU ITEMS (Web & Udemy Parity)
                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.School, contentDescription = null, tint = Color(0xFF38BDF8)) },
                                label = { Text("Courses & Curriculum", fontWeight = FontWeight.SemiBold) },
                                selected = selectedBottomNav == 0,
                                onClick = {
                                    selectedBottomNav = 0
                                    scope.launch { drawerState.close() }
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.PlayCircle, contentDescription = null, tint = Color(0xFF38BDF8)) },
                                label = { Text("My Learning & Progress", fontWeight = FontWeight.SemiBold) },
                                selected = selectedBottomNav == 2,
                                onClick = {
                                    selectedBottomNav = 2
                                    scope.launch { drawerState.close() }
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.Book, contentDescription = null, tint = Color(0xFF38BDF8)) },
                                label = { Text("Learning Resources & Notes", fontWeight = FontWeight.SemiBold) },
                                selected = selectedBottomNav == 1,
                                onClick = {
                                    selectedBottomNav = 1
                                    scope.launch { drawerState.close() }
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.Assignment, contentDescription = null, tint = Color(0xFF10B981)) },
                                label = { Text("Practice Exams & Quizzes", fontWeight = FontWeight.SemiBold) },
                                selected = false,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    showExamsDialog = true
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.Leaderboard, contentDescription = null, tint = Color(0xFFF59E0B)) },
                                label = { Text("Student Leaderboard", fontWeight = FontWeight.SemiBold) },
                                selected = false,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    showLeaderboardDialog = true
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.Forum, contentDescription = null, tint = Color(0xFFA855F7)) },
                                label = { Text("Discussion & Community", fontWeight = FontWeight.SemiBold) },
                                selected = false,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    showDiscussionDialog = true
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            Spacer(modifier = Modifier.height(8.dp))
                            HorizontalDivider(color = Color(0xFF1E293B))
                            Spacer(modifier = Modifier.height(8.dp))

                            NavigationDrawerItem(
                                icon = { Icon(Icons.Default.Settings, contentDescription = null, tint = Color(0xFF94A3B8)) },
                                label = { Text("App Settings & Cache", fontWeight = FontWeight.SemiBold) },
                                selected = false,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    navController.navigate(Screen.Settings.route)
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                                    unselectedContainerColor = Color.Transparent,
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color(0xFFCBD5E1)
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )

                            if (isLoggedIn) {
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFEF4444)) },
                                    label = { Text("Sign Out", color = Color(0xFFEF4444), fontWeight = FontWeight.SemiBold) },
                                    selected = false,
                                    onClick = {
                                        scope.launch {
                                            drawerState.close()
                                            authRepository.signOut()
                                        }
                                    },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = Color.Transparent,
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp)
                                )
                            }
                        }
                    }
                }
            ) {
                Scaffold(
                    bottomBar = {
                        // 4-Tab Bottom Navigation Bar (Udemy & Coursera Pattern)
                        NavigationBar(
                            containerColor = Color(0xFF0F172A)
                        ) {
                            NavigationBarItem(
                                selected = selectedBottomNav == 0,
                                onClick = { selectedBottomNav = 0 },
                                icon = { Icon(Icons.Default.School, contentDescription = "Courses") },
                                label = { Text("Courses", fontSize = 11.sp) },
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
                                label = { Text("Resources", fontSize = 11.sp) },
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
                                icon = { Icon(Icons.Default.PlayCircle, contentDescription = "My Learning") },
                                label = { Text("My Learning", fontSize = 11.sp) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color.White,
                                    selectedTextColor = Color(0xFF38BDF8),
                                    indicatorColor = Color(0xFF0284C7),
                                    unselectedIconColor = Color(0xFF64748B),
                                    unselectedTextColor = Color(0xFF64748B)
                                )
                            )
                            NavigationBarItem(
                                selected = selectedBottomNav == 3,
                                onClick = { selectedBottomNav = 3 },
                                icon = { Icon(Icons.Default.Person, contentDescription = "Account") },
                                label = { Text("Account", fontSize = 11.sp) },
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
                                    selectedBottomNav = 3
                                },
                                onOpenDrawer = {
                                    scope.launch { drawerState.open() }
                                }
                            )
                            1 -> ResourcesScreen(
                                courseRepository = courseRepository,
                                onViewResource = { title, fileUrl ->
                                    navController.navigate(Screen.DocumentReader.createRoute(title, fileUrl))
                                },
                                onCourseClick = { courseId ->
                                    navController.navigate(Screen.CourseDetail.createRoute(courseId))
                                },
                                onOpenDrawer = {
                                    scope.launch { drawerState.open() }
                                }
                            )
                            2 -> MyLearningScreen(
                                courseRepository = courseRepository,
                                authRepository = authRepository,
                                progressRepository = progressRepository,
                                playerManager = playerManager,
                                onCourseClick = { courseId ->
                                    navController.navigate(Screen.CourseDetail.createRoute(courseId))
                                },
                                onResumeLessonClick = { courseId, lessonId ->
                                    navController.navigate(Screen.LessonPlayer.createRoute(courseId, lessonId))
                                },
                                onOpenDrawer = {
                                    scope.launch { drawerState.open() }
                                }
                            )
                            3 -> ProfileScreen(
                                authRepository = authRepository,
                                courseRepository = courseRepository,
                                onNavigateToSettings = {
                                    navController.navigate(Screen.Settings.route)
                                },
                                onSelectCourse = { courseId ->
                                    navController.navigate(Screen.CourseDetail.createRoute(courseId))
                                },
                                onOpenDrawer = {
                                    scope.launch { drawerState.open() }
                                }
                            )
                        }
                    }
                }
            }

            // PRACTICE EXAMS MODAL DIALOG
            if (showExamsDialog) {
                Dialog(onDismissRequest = { showExamsDialog = false }) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF131B2E))
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Assignment, contentDescription = null, tint = Color(0xFF10B981))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Practice Exams & MCQs", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                                IconButton(onClick = { showExamsDialog = false }) {
                                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Technical mock tests covering C, DSA, DBMS, DLD, Computer Networks and OOP are linked with each module's question banks in the Resources tab.",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    showExamsDialog = false
                                    selectedBottomNav = 1
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Browse MCQ Question Banks", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // LEADERBOARD MODAL DIALOG
            if (showLeaderboardDialog) {
                Dialog(onDismissRequest = { showLeaderboardDialog = false }) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF131B2E))
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Leaderboard, contentDescription = null, tint = Color(0xFFF59E0B))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Top Students Leaderboard", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                                IconButton(onClick = { showLeaderboardDialog = false }) {
                                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            listOf(
                                "1. Tanvir Ahmed" to "98% Completion • 51 Lectures",
                                "2. Sabrina Yasmin" to "92% Completion • 47 Lectures",
                                "3. Rafiqul Islam" to "86% Completion • 44 Lectures"
                            ).forEach { (name, stats) ->
                                Surface(
                                    color = Color(0xFF1E293B).copy(alpha = 0.5f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(name, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            Text(stats, color = Color(0xFF94A3B8), fontSize = 10.sp)
                                        }
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(14.dp))
                            Button(
                                onClick = { showLeaderboardDialog = false },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Close", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // DISCUSSION FORUM MODAL DIALOG
            if (showDiscussionDialog) {
                Dialog(onDismissRequest = { showDiscussionDialog = false }) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF131B2E))
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Forum, contentDescription = null, tint = Color(0xFFA855F7))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Community Discussion", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                                IconButton(onClick = { showDiscussionDialog = false }) {
                                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Have doubts regarding C pointers, SQL normal forms, or OOP polymorphism? Ask your questions directly in the classroom under each lecture's notes tab or reach out to instructor via support.",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { showDiscussionDialog = false },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Got it!", fontWeight = FontWeight.Bold)
                            }
                        }
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
                authRepository = authRepository,
                progressRepository = progressRepository,
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
