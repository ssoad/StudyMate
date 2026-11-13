package org.armorclub.studymate.ui.navigation

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material.icons.outlined.BrightnessAuto
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavHostController
import kotlinx.coroutines.launch
import org.armorclub.studymate.R
import org.armorclub.studymate.data.model.LeaderboardEntry
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.data.repository.ThemeMode
import org.armorclub.studymate.data.repository.ThemeRepository
import org.armorclub.studymate.player.PlayerManager
import org.armorclub.studymate.ui.components.Hairline
import org.armorclub.studymate.ui.components.InitialsAvatar
import org.armorclub.studymate.ui.components.ListRow
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.SecondaryButton
import org.armorclub.studymate.ui.components.SmDialogCard
import org.armorclub.studymate.ui.components.smDrawerItemColors
import org.armorclub.studymate.ui.components.smNavBarItemColors
import org.armorclub.studymate.ui.screens.CourseListScreen
import org.armorclub.studymate.ui.screens.MyLearningScreen
import org.armorclub.studymate.ui.screens.ProfileScreen
import org.armorclub.studymate.ui.screens.ResourcesScreen
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing

private enum class Tab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Outlined.Home),
    Resources("Resources", Icons.Outlined.Folder),
    Learning("Learning", Icons.Outlined.MenuBook),
    Account("Account", Icons.Outlined.Person)
}

private enum class InfoDialog { Exams, Leaderboard, Discussion }

@Composable
internal fun MainShell(
    navController: NavHostController,
    courseRepository: CourseRepository,
    authRepository: AuthRepository,
    progressRepository: ProgressRepository,
    enrollmentRepository: EnrollmentRepository,
    playerManager: PlayerManager,
    themeRepository: ThemeRepository
) {
    var tab by rememberSaveable { mutableStateOf(Tab.Home) }
    var dialog by remember { mutableStateOf<InfoDialog?>(null) }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val openDrawer: () -> Unit = { scope.launch { drawerState.open() } }
    fun closeDrawerThen(action: () -> Unit) {
        scope.launch { drawerState.close() }
        action()
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AppDrawer(
                authRepository = authRepository,
                themeRepository = themeRepository,
                currentTab = tab,
                onSelectTab = { t -> closeDrawerThen { tab = t } },
                onOpenDialog = { d -> closeDrawerThen { dialog = d } },
                onOpenSettings = { closeDrawerThen { navController.navigate(Screen.Settings.route) } },
                onSignOut = { closeDrawerThen { authRepository.signOut() } }
            )
        }
    ) {
        Scaffold(
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
            containerColor = AppTheme.colors.background,
            bottomBar = {
                Column {
                    Hairline()
                    NavigationBar(
                        containerColor = AppTheme.colors.bottomNavBackground,
                        tonalElevation = 0.dp
                    ) {
                        Tab.entries.forEach { t ->
                            NavigationBarItem(
                                selected = tab == t,
                                onClick = { tab = t },
                                icon = { Icon(t.icon, contentDescription = null) },
                                label = { Text(t.label, style = MaterialTheme.typography.labelSmall) },
                                colors = smNavBarItemColors()
                            )
                        }
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = innerPadding.calculateBottomPadding())
            ) {
                AnimatedContent(
                    targetState = tab,
                    transitionSpec = { fadeIn(tween(160)) togetherWith fadeOut(tween(120)) },
                    label = "tab"
                ) { current ->
                    when (current) {
                        Tab.Home -> CourseListScreen(
                            courseRepository = courseRepository,
                            authRepository = authRepository,
                            enrollmentRepository = enrollmentRepository,
                            playerManager = playerManager,
                            onCourseClick = { navController.navigate(Screen.CourseDetail.createRoute(it)) },
                            onResumeLessonClick = { c, l -> navController.navigate(Screen.LessonPlayer.createRoute(c, l)) },
                            onProfileClick = { tab = Tab.Account },
                            onOpenDrawer = openDrawer
                        )
                        Tab.Resources -> ResourcesScreen(
                            courseRepository = courseRepository,
                            authRepository = authRepository,
                            enrollmentRepository = enrollmentRepository,
                            onViewResource = { title, url -> navController.navigate(Screen.DocumentReader.createRoute(title, url)) },
                            onCourseClick = { navController.navigate(Screen.CourseDetail.createRoute(it)) },
                            onOpenDrawer = openDrawer
                        )
                        Tab.Learning -> MyLearningScreen(
                            courseRepository = courseRepository,
                            authRepository = authRepository,
                            progressRepository = progressRepository,
                            enrollmentRepository = enrollmentRepository,
                            playerManager = playerManager,
                            onCourseClick = { navController.navigate(Screen.CourseDetail.createRoute(it)) },
                            onResumeLessonClick = { c, l -> navController.navigate(Screen.LessonPlayer.createRoute(c, l)) },
                            onOpenDrawer = openDrawer,
                            onBrowseCourses = { tab = Tab.Home },
                            onSignIn = { tab = Tab.Account }
                        )
                        Tab.Account -> ProfileScreen(
                            authRepository = authRepository,
                            courseRepository = courseRepository,
                            themeRepository = themeRepository,
                            progressRepository = progressRepository,
                            enrollmentRepository = enrollmentRepository,
                            onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                            onSelectCourse = { navController.navigate(Screen.CourseDetail.createRoute(it)) },
                            onOpenDrawer = openDrawer
                        )
                    }
                }
            }
        }
    }

    when (dialog) {
        InfoDialog.Exams -> InfoDialogFrame(
            icon = Icons.Outlined.Assignment,
            title = "Practice exams",
            onDismiss = { dialog = null }
        ) {
            Text(
                "Mock tests for C, data structures, DBMS, digital logic, networks and OOP are in each module's question bank under Resources.",
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colors.textSecondary
            )
            Spacer(Modifier.height(Spacing.lg))
            PrimaryButton("Open question banks", onClick = { dialog = null; tab = Tab.Resources }, modifier = Modifier.fillMaxWidth())
        }
        InfoDialog.Leaderboard -> InfoDialogFrame(
            icon = Icons.Outlined.EmojiEvents,
            title = "Leaderboard",
            onDismiss = { dialog = null }
        ) {
            LeaderboardList(courseRepository)
            Spacer(Modifier.height(Spacing.md))
            SecondaryButton("Close", onClick = { dialog = null }, modifier = Modifier.fillMaxWidth())
        }
        InfoDialog.Discussion -> InfoDialogFrame(
            icon = Icons.Outlined.Forum,
            title = "Discussion",
            onDismiss = { dialog = null }
        ) {
            Text(
                "Questions about a lecture? Add them to the lecture's notes, or contact the instructor through support.",
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colors.textSecondary
            )
            Spacer(Modifier.height(Spacing.lg))
            SecondaryButton("Got it", onClick = { dialog = null }, modifier = Modifier.fillMaxWidth())
        }
        null -> Unit
    }
}

@Composable
private fun AppDrawer(
    authRepository: AuthRepository,
    themeRepository: ThemeRepository,
    currentTab: Tab,
    onSelectTab: (Tab) -> Unit,
    onOpenDialog: (InfoDialog) -> Unit,
    onOpenSettings: () -> Unit,
    onSignOut: () -> Unit
) {
    val user by authRepository.currentUser.collectAsState()
    val isLoggedIn by authRepository.isLoggedIn.collectAsState()
    val themeMode by themeRepository.themeMode.collectAsState()

    ModalDrawerSheet(
        drawerContainerColor = AppTheme.colors.drawerBackground,
        drawerContentColor = AppTheme.colors.textPrimary,
        drawerShape = RoundedCornerShape(topEnd = Radius.sheet, bottomEnd = Radius.sheet)
    ) {
        Column(Modifier.fillMaxWidth().padding(vertical = Spacing.md)) {
            Row(
                Modifier.padding(horizontal = Spacing.lg, vertical = Spacing.xs),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_studymate_logo),
                    contentDescription = null,
                    modifier = Modifier.size(28.dp).clip(RoundedCornerShape(Radius.xs))
                )
                Spacer(Modifier.width(Spacing.sm))
                Text("StudyMate", style = MaterialTheme.typography.titleLarge)
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Spacing.sm, vertical = Spacing.xs)
                    .clip(RoundedCornerShape(Radius.control))
                    .clickable { onSelectTab(Tab.Account) }
                    .padding(Spacing.sm),
                verticalAlignment = Alignment.CenterVertically
            ) {
                InitialsAvatar(user?.fullName ?: "Guest", size = 40.dp)
                Spacer(Modifier.width(Spacing.sm))
                Column(Modifier.weight(1f)) {
                    Text(user?.fullName ?: "Guest", style = MaterialTheme.typography.titleSmall)
                    Text(
                        user?.email ?: "Sign in to sync your progress",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppTheme.colors.textSecondary,
                        maxLines = 1
                    )
                }
            }

            Hairline(Modifier.padding(vertical = Spacing.xs))

            DrawerItem("Home", Icons.Outlined.Home, currentTab == Tab.Home) { onSelectTab(Tab.Home) }
            DrawerItem("My learning", Icons.Outlined.MenuBook, currentTab == Tab.Learning) { onSelectTab(Tab.Learning) }
            DrawerItem("Resources", Icons.Outlined.Folder, currentTab == Tab.Resources) { onSelectTab(Tab.Resources) }
            DrawerItem("Practice exams", Icons.Outlined.Assignment) { onOpenDialog(InfoDialog.Exams) }
            DrawerItem("Leaderboard", Icons.Outlined.EmojiEvents) { onOpenDialog(InfoDialog.Leaderboard) }
            DrawerItem("Discussion", Icons.Outlined.Forum) { onOpenDialog(InfoDialog.Discussion) }

            Hairline(Modifier.padding(vertical = Spacing.xs))

            DrawerItem(
                label = "Theme",
                icon = when (themeMode) {
                    ThemeMode.LIGHT -> Icons.Outlined.LightMode
                    ThemeMode.SYSTEM -> Icons.Outlined.BrightnessAuto
                    else -> Icons.Outlined.DarkMode
                },
                badge = themeMode.title,
                onClick = { themeRepository.toggleTheme() }
            )
            DrawerItem("Settings", Icons.Outlined.Settings, onClick = onOpenSettings)
            if (isLoggedIn) {
                DrawerItem("Sign out", Icons.AutoMirrored.Outlined.Logout, onClick = onSignOut)
            } else {
                DrawerItem("Sign in", Icons.AutoMirrored.Outlined.Login) { onSelectTab(Tab.Account) }
            }
        }
    }
}

@Composable
private fun DrawerItem(
    label: String,
    icon: ImageVector,
    selected: Boolean = false,
    badge: String? = null,
    onClick: () -> Unit
) {
    NavigationDrawerItem(
        icon = { Icon(icon, contentDescription = null) },
        label = { Text(label, style = MaterialTheme.typography.bodyLarge) },
        badge = badge?.let { { Text(it, style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.textSecondary) } },
        selected = selected,
        onClick = onClick,
        shape = RoundedCornerShape(Radius.control),
        colors = smDrawerItemColors(),
        modifier = Modifier.padding(horizontal = Spacing.sm).height(48.dp)
    )
}

@Composable
private fun InfoDialogFrame(
    icon: ImageVector,
    title: String,
    onDismiss: () -> Unit,
    content: @Composable () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        SmDialogCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = AppTheme.colors.textSecondary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(Spacing.xs))
                Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(Spacing.sm))
            content()
        }
    }
}

@Composable
private fun LeaderboardList(courseRepository: CourseRepository) {
    var entries by remember { mutableStateOf<List<LeaderboardEntry>?>(null) }
    LaunchedEffect(Unit) { entries = courseRepository.getLeaderboard(10) }

    val list = entries
    when {
        list == null -> Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(24.dp), color = AppTheme.colors.primary)
        }
        list.isEmpty() -> Text(
            "The leaderboard isn't available right now. Check your connection and try again.",
            style = MaterialTheme.typography.bodyMedium,
            color = AppTheme.colors.textSecondary
        )
        else -> Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
            list.forEachIndexed { i, e ->
                ListRow(
                    title = e.fullName?.takeIf { it.isNotBlank() } ?: "Student",
                    showDivider = i != list.lastIndex,
                    leading = {
                        Text(
                            "${i + 1}",
                            style = MaterialTheme.typography.titleSmall,
                            color = if (i < 3) AppTheme.colors.primary else AppTheme.colors.textMuted,
                            modifier = Modifier.width(20.dp)
                        )
                    },
                    trailing = {
                        Text("${e.points} pts", style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.textSecondary)
                    }
                )
            }
        }
    }
}
