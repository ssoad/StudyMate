package org.armorclub.studymate.ui.screens

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.armorclub.studymate.BuildConfig
import org.armorclub.studymate.R
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.repository.AuthRepository
import org.armorclub.studymate.data.repository.CourseRepository
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.data.repository.ProgressRepository
import org.armorclub.studymate.data.repository.ThemeMode
import org.armorclub.studymate.data.repository.ThemeRepository
import org.armorclub.studymate.ui.components.Badge
import org.armorclub.studymate.ui.components.BadgeTone
import org.armorclub.studymate.ui.components.FilterPill
import org.armorclub.studymate.ui.components.GhostButton
import org.armorclub.studymate.ui.components.InitialsAvatar
import org.armorclub.studymate.ui.components.ListRow
import org.armorclub.studymate.ui.components.PrimaryButton
import org.armorclub.studymate.ui.components.ProgressTrack
import org.armorclub.studymate.ui.components.ScreenHeader
import org.armorclub.studymate.ui.components.SecondaryButton
import org.armorclub.studymate.ui.components.SectionHeader
import org.armorclub.studymate.ui.components.SmCard
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing

@Composable
fun ProfileScreen(
    authRepository: AuthRepository,
    courseRepository: CourseRepository,
    themeRepository: ThemeRepository,
    progressRepository: ProgressRepository,
    enrollmentRepository: EnrollmentRepository,
    onNavigateToSettings: () -> Unit,
    onSelectCourse: (String) -> Unit,
    onOpenDrawer: () -> Unit = {}
) {
    val currentUser by authRepository.currentUser.collectAsState()
    val isLoggedIn by authRepository.isLoggedIn.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
    ) {
        ScreenHeader(
            title = "Account",
            leading = {
                IconButton(onClick = onOpenDrawer) {
                    Icon(Icons.Outlined.Menu, contentDescription = "Open menu", tint = AppTheme.colors.textPrimary)
                }
            },
            actions = {
                IconButton(onClick = onNavigateToSettings) {
                    Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = AppTheme.colors.textPrimary)
                }
            }
        )

        val user = currentUser
        if (isLoggedIn && user != null) {
            SignedInContent(
                userName = user.fullName,
                email = user.email,
                role = user.role,
                points = user.points,
                courseRepository = courseRepository,
                progressRepository = progressRepository,
                enrollmentRepository = enrollmentRepository,
                themeRepository = themeRepository,
                currentUser = user,
                onSelectCourse = onSelectCourse,
                onSignOut = { authRepository.signOut() }
            )
        } else {
            SignInContent(authRepository = authRepository, themeRepository = themeRepository)
        }
    }
}

private data class CourseProgressRow(val course: Course, val done: Int, val total: Int)

@Composable
private fun SignedInContent(
    userName: String,
    email: String,
    role: String,
    points: Int,
    courseRepository: CourseRepository,
    progressRepository: ProgressRepository,
    enrollmentRepository: EnrollmentRepository,
    themeRepository: ThemeRepository,
    currentUser: org.armorclub.studymate.data.model.UserProfile,
    onSelectCourse: (String) -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    val progressMap by progressRepository.progressMap.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()
    val themeMode by themeRepository.themeMode.collectAsState()

    LaunchedEffect(Unit) { courses = courseRepository.getCourses() }

    val userId = progressRepository.getGuestOrUserId()
    // Recomputed when progress or enrollments change.
    val rows = remember(courses, progressMap, enrollments) {
        courses.mapNotNull { c ->
            val total = c.sections.sumOf { it.lessons.size }
            val done = progressRepository.getCompletedCount(userId, c)
            val enrolled = enrollmentRepository.isCourseApproved(c.id, currentUser, c.price)
            if (enrolled || done > 0) CourseProgressRow(c, done, total) else null
        }
    }
    val lessonsDone = rows.sumOf { it.done }
    val enrolledCount = remember(courses, enrollments) {
        courses.count { enrollmentRepository.isCourseApproved(it.id, currentUser, it.price) }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
    ) {
        item(key = "identity") {
            Row(
                Modifier.padding(top = Spacing.sm),
                verticalAlignment = Alignment.CenterVertically
            ) {
                InitialsAvatar(userName, size = 56.dp)
                Spacer(Modifier.width(Spacing.md))
                Column(Modifier.weight(1f)) {
                    Text(
                        userName,
                        style = MaterialTheme.typography.titleLarge,
                        color = AppTheme.colors.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        email,
                        style = MaterialTheme.typography.bodyMedium,
                        color = AppTheme.colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Badge(
                    if (role == "admin") "Admin" else "Student",
                    tone = if (role == "admin") BadgeTone.Accent else BadgeTone.Neutral
                )
            }
        }

        item(key = "stats") {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = Spacing.lg),
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                StatTile("Points", points.toString(), Modifier.weight(1f))
                StatTile("Lessons done", lessonsDone.toString(), Modifier.weight(1f))
                StatTile("Enrolled", enrolledCount.toString(), Modifier.weight(1f))
            }
        }

        item(key = "courses-header") { SectionHeader("Your courses") }
        if (rows.isEmpty()) {
            item(key = "courses-empty") {
                Text(
                    "Courses you enroll in or start will show up here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppTheme.colors.textSecondary
                )
            }
        } else {
            items(rows, key = { "course-${it.course.id}" }) { row ->
                SmCard(
                    modifier = Modifier.padding(bottom = Spacing.sm),
                    onClick = { onSelectCourse(row.course.id) }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            row.course.title,
                            style = MaterialTheme.typography.titleSmall,
                            color = AppTheme.colors.textPrimary,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = AppTheme.colors.textMuted)
                    }
                    Spacer(Modifier.height(Spacing.xs))
                    Text(
                        "${row.done} of ${row.total} lessons done",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppTheme.colors.textSecondary
                    )
                    Spacer(Modifier.height(Spacing.xs))
                    ProgressTrack(if (row.total == 0) 0f else row.done.toFloat() / row.total)
                }
            }
        }

        item(key = "appearance") {
            SectionHeader("Appearance")
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                ThemeMode.entries.forEach { mode ->
                    FilterPill(
                        text = mode.title,
                        selected = themeMode == mode,
                        onClick = { themeRepository.setThemeMode(mode) }
                    )
                }
            }
        }

        item(key = "session") {
            SectionHeader("Session")
            ListRow(
                title = "Sign out",
                titleColor = AppTheme.colors.error,
                showDivider = false,
                onClick = {
                    onSignOut()
                    Toast.makeText(context, "Signed out", Toast.LENGTH_SHORT).show()
                },
                leading = {
                    Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null, tint = AppTheme.colors.error, modifier = Modifier.size(20.dp))
                }
            )
        }
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    SmCard(modifier = modifier, padding = Spacing.sm) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = AppTheme.colors.textPrimary, maxLines = 1)
        Text(label, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary, maxLines = 1)
    }
}

@Composable
private fun SignInContent(authRepository: AuthRepository, themeRepository: ThemeRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var isSignUp by rememberSaveable { mutableStateOf(false) }
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by rememberSaveable { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun submit() {
        if (email.isBlank() || password.isBlank()) {
            error = "Enter your email and password."
            return
        }
        if (isSignUp && password.length < 8) {
            error = "Password must be at least 8 characters."
            return
        }
        scope.launch {
            loading = true
            error = null
            val result = if (isSignUp) authRepository.signUp(email.trim(), password, name.trim())
            else authRepository.signIn(email.trim(), password)
            loading = false
            result.onSuccess {
                Toast.makeText(context, "Welcome, ${it.fullName}", Toast.LENGTH_SHORT).show()
            }.onFailure { err ->
                error = err.localizedMessage ?: "Couldn't sign in. Try again."
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item(key = "brand") {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = Spacing.lg)) {
                Image(
                    painter = painterResource(id = R.drawable.ic_studymate_logo),
                    contentDescription = null,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(Radius.card))
                )
                Spacer(Modifier.height(Spacing.md))
                Text(
                    if (isSignUp) "Create your account" else "Sign in to StudyMate",
                    style = MaterialTheme.typography.headlineSmall,
                    color = AppTheme.colors.textPrimary
                )
                Spacer(Modifier.height(Spacing.xxs))
                Text(
                    "Track progress, keep notes, and pick up where you left off on any device.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppTheme.colors.textSecondary,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(Spacing.lg))
            }
        }

        item(key = "form") {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                if (isSignUp) {
                    SmTextField(value = name, onValueChange = { name = it }, label = "Full name")
                }
                SmTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Email",
                    keyboardType = KeyboardType.Email
                )
                SmTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Password",
                    keyboardType = KeyboardType.Password,
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    trailing = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = if (showPassword) "Hide password" else "Show password",
                                tint = AppTheme.colors.textMuted
                            )
                        }
                    }
                )
                error?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.error)
                }
                Spacer(Modifier.height(Spacing.xxs))
                if (loading) {
                    Row(Modifier.fillMaxWidth().height(48.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(color = AppTheme.colors.primary, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                    }
                } else {
                    PrimaryButton(
                        text = if (isSignUp) "Create account" else "Sign in",
                        onClick = ::submit,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                GhostButton(
                    text = if (isSignUp) "Already have an account? Sign in" else "New here? Create an account",
                    onClick = { isSignUp = !isSignUp; error = null },
                    modifier = Modifier.fillMaxWidth()
                )
                if (BuildConfig.DEBUG) {
                    SecondaryButton(
                        text = "Demo sign in (debug build)",
                        enabled = !loading,
                        onClick = {
                            scope.launch {
                                loading = true
                                error = null
                                val result = authRepository.signInAsDemo()
                                loading = false
                                result.onFailure { err -> error = err.localizedMessage }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        item(key = "appearance") {
            val themeMode by themeRepository.themeMode.collectAsState()
            Column(Modifier.fillMaxWidth()) {
                SectionHeader("Appearance")
                Row(
                    Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                ) {
                    ThemeMode.entries.forEach { mode ->
                        FilterPill(mode.title, selected = themeMode == mode, onClick = { themeRepository.setThemeMode(mode) })
                    }
                }
            }
        }
    }
}

@Composable
private fun SmTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailing: (@Composable () -> Unit)? = null
) {
    val c = AppTheme.colors
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = visualTransformation,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        trailingIcon = trailing,
        shape = RoundedCornerShape(Radius.control),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = c.primary,
            unfocusedBorderColor = c.cardBorder,
            focusedLabelColor = c.primary,
            unfocusedLabelColor = c.textMuted,
            cursorColor = c.primary,
            focusedTextColor = c.textPrimary,
            unfocusedTextColor = c.textPrimary,
            focusedContainerColor = c.cardBackground,
            unfocusedContainerColor = c.cardBackground
        ),
        modifier = Modifier.fillMaxWidth()
    )
}
