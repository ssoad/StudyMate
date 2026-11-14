package org.armorclub.studymate.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.outlined.Edit
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.TextButton
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import org.armorclub.studymate.data.BundledCourses
import org.armorclub.studymate.ui.components.Hairline
import org.armorclub.studymate.ui.components.RowTint
import org.armorclub.studymate.ui.components.SettingsGroup
import org.armorclub.studymate.ui.components.SettingsRow
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
                onOpenSettings = onNavigateToSettings,
                onSaveProfile = { name, bio -> authRepository.updateProfile(name, bio) },
                onSignOut = { authRepository.signOut() }
            )
        } else {
            SignInContent(authRepository = authRepository, themeRepository = themeRepository)
        }
    }
}

private data class CourseProgressRow(val course: Course, val done: Int, val total: Int)

@OptIn(ExperimentalMaterial3Api::class)
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
    onOpenSettings: () -> Unit,
    onSaveProfile: suspend (name: String, bio: String) -> String?,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    var showEditProfile by remember { mutableStateOf(false) }
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    val progressMap by progressRepository.progressMap.collectAsState()
    val enrollments by enrollmentRepository.enrollments.collectAsState()
    val themeMode by themeRepository.themeMode.collectAsState()
    var showThemeSheet by remember { mutableStateOf(false) }
    var confirmSignOut by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { courses = courseRepository.getCourses() }

    val userId = progressRepository.getGuestOrUserId()
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
    val isAdmin = role == "admin"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
    ) {
        // Profile card
        item(key = "profile") {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = Spacing.sm)
                    .clip(RoundedCornerShape(Radius.card))
                    .background(AppTheme.colors.cardBackground)
                    .border(1.dp, AppTheme.colors.cardBorder, RoundedCornerShape(Radius.card))
            ) {
                Row(Modifier.padding(Spacing.md), verticalAlignment = Alignment.CenterVertically) {
                    val avatar = currentUser.avatarUrl?.takeIf { it.isNotBlank() }
                    if (avatar != null) {
                        AsyncImage(
                            model = courseRepository.resolveResourceUrl(avatar),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(60.dp).clip(CircleShape)
                        )
                    } else {
                        InitialsAvatar(userName, size = 60.dp)
                    }
                    Spacer(Modifier.width(Spacing.md))
                    Column(Modifier.weight(1f)) {
                        Text(userName, style = MaterialTheme.typography.titleLarge, color = AppTheme.colors.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(email, style = MaterialTheme.typography.bodyMedium, color = AppTheme.colors.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(Spacing.xxs))
                        Badge(if (isAdmin) "Admin" else "Student", tone = if (isAdmin) BadgeTone.Accent else BadgeTone.Neutral)
                    }
                }
                currentUser.bio?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = AppTheme.colors.textSecondary,
                        modifier = Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.sm)
                    )
                }
                SecondaryButton(
                    text = "Edit profile",
                    icon = Icons.Outlined.Edit,
                    onClick = { showEditProfile = true },
                    modifier = Modifier.fillMaxWidth().padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.md)
                )
                Hairline()
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                    StatCell("Points", points.toString(), Modifier.weight(1f))
                    VerticalHairline()
                    StatCell("Lessons done", lessonsDone.toString(), Modifier.weight(1f))
                    VerticalHairline()
                    StatCell("Enrolled", enrolledCount.toString(), Modifier.weight(1f))
                }
            }
        }

        // Courses
        item(key = "courses") {
            SettingsGroup(title = "Your courses") {
                if (rows.isEmpty()) {
                    SettingsRow(
                        title = "Browse courses",
                        subtitle = "Courses you enroll in or start show up here",
                        icon = Icons.Outlined.School,
                        showChevron = true,
                        onClick = { courses.firstOrNull()?.let { onSelectCourse(it.id) } }
                    )
                } else {
                    rows.forEachIndexed { i, row ->
                        CourseProgressItem(row, divider = i > 0, onClick = { onSelectCourse(row.course.id) })
                    }
                }
            }
        }

        // Preferences
        item(key = "prefs") {
            SettingsGroup(title = "Preferences") {
                SettingsRow(
                    title = "Appearance",
                    icon = Icons.Outlined.Palette,
                    value = themeMode.title,
                    showChevron = true,
                    onClick = { showThemeSheet = true }
                )
                SettingsRow(
                    title = "Settings",
                    subtitle = "Storage, offline cache and app info",
                    icon = Icons.Outlined.Settings,
                    tint = RowTint.Neutral,
                    showChevron = true,
                    divider = true,
                    onClick = onOpenSettings
                )
            }
        }

        // Support
        item(key = "support") {
            SettingsGroup(title = "Support") {
                SettingsRow(
                    title = "Share StudyMate",
                    icon = Icons.Outlined.Share,
                    tint = RowTint.Neutral,
                    showChevron = true,
                    onClick = {
                        context.startActivity(
                            Intent.createChooser(
                                Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, "Prepare for AD (ICT) with StudyMate: ${BundledCourses.FALLBACK_WEB_URL}")
                                },
                                "Share StudyMate"
                            )
                        )
                    }
                )
                SettingsRow(
                    title = "Open website",
                    icon = Icons.Outlined.Language,
                    tint = RowTint.Neutral,
                    value = Uri.parse(BundledCourses.FALLBACK_WEB_URL).host,
                    showChevron = true,
                    divider = true,
                    onClick = {
                        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledCourses.FALLBACK_WEB_URL))) }
                    }
                )
            }
        }

        // Session
        item(key = "session") {
            SettingsGroup {
                SettingsRow(
                    title = "Sign out",
                    icon = Icons.AutoMirrored.Outlined.Logout,
                    destructive = true,
                    onClick = { confirmSignOut = true }
                )
            }
            Text(
                "StudyMate ${BuildConfig.VERSION_NAME}",
                style = MaterialTheme.typography.bodySmall,
                color = AppTheme.colors.textMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = Spacing.lg)
            )
        }
    }

    if (showThemeSheet) {
        ModalBottomSheet(
            onDismissRequest = { showThemeSheet = false },
            containerColor = AppTheme.colors.surfaceElevated
        ) {
            Column(Modifier.padding(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)) {
                Text("Appearance", style = MaterialTheme.typography.titleMedium, color = AppTheme.colors.textPrimary)
                Spacer(Modifier.height(Spacing.sm))
                ThemeMode.entries.forEach { mode ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(Radius.control))
                            .clickable {
                                themeRepository.setThemeMode(mode)
                                showThemeSheet = false
                            }
                            .padding(vertical = Spacing.sm, horizontal = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(mode.title, style = MaterialTheme.typography.bodyLarge, color = AppTheme.colors.textPrimary)
                            Text(mode.description, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary)
                        }
                        RadioButton(
                            selected = themeMode == mode,
                            onClick = {
                                themeRepository.setThemeMode(mode)
                                showThemeSheet = false
                            },
                            colors = RadioButtonDefaults.colors(selectedColor = AppTheme.colors.primary, unselectedColor = AppTheme.colors.textMuted)
                        )
                    }
                }
            }
        }
    }

    if (showEditProfile) {
        EditProfileSheet(
            initialName = currentUser.fullName,
            initialBio = currentUser.bio.orEmpty(),
            onSave = onSaveProfile,
            onDismiss = { showEditProfile = false }
        )
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            containerColor = AppTheme.colors.surfaceElevated,
            title = { Text("Sign out?", color = AppTheme.colors.textPrimary) },
            text = { Text("Your progress is saved to your account. Notes stay on this device.", color = AppTheme.colors.textSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    confirmSignOut = false
                    onSignOut()
                    Toast.makeText(context, "Signed out", Toast.LENGTH_SHORT).show()
                }) { Text("Sign out", color = AppTheme.colors.error) }
            },
            dismissButton = {
                TextButton(onClick = { confirmSignOut = false }) { Text("Cancel", color = AppTheme.colors.textSecondary) }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileSheet(
    initialName: String,
    initialBio: String,
    onSave: suspend (String, String) -> String?,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by rememberSaveable { mutableStateOf(initialName) }
    var bio by rememberSaveable { mutableStateOf(initialBio) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    ModalBottomSheet(onDismissRequest = { if (!saving) onDismiss() }, containerColor = AppTheme.colors.surfaceElevated) {
        Column(
            Modifier
                .padding(start = Spacing.gutter, end = Spacing.gutter, bottom = Spacing.xl)
                .imePadding()
        ) {
            Text("Edit profile", style = MaterialTheme.typography.titleMedium, color = AppTheme.colors.textPrimary)
            Spacer(Modifier.height(Spacing.md))
            SmTextField(value = name, onValueChange = { name = it.take(60); error = null }, label = "Name")
            Spacer(Modifier.height(Spacing.sm))
            OutlinedTextField(
                value = bio,
                onValueChange = { bio = it.take(300) },
                label = { Text("Bio") },
                supportingText = { Text("${bio.length}/300") },
                minLines = 3,
                shape = RoundedCornerShape(Radius.control),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AppTheme.colors.primary,
                    unfocusedBorderColor = AppTheme.colors.cardBorder,
                    focusedLabelColor = AppTheme.colors.primary,
                    unfocusedLabelColor = AppTheme.colors.textMuted,
                    focusedTextColor = AppTheme.colors.textPrimary,
                    unfocusedTextColor = AppTheme.colors.textPrimary,
                    cursorColor = AppTheme.colors.primary
                ),
                modifier = Modifier.fillMaxWidth()
            )
            error?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.error)
            }
            Text(
                "Your photo can be changed on the website.",
                style = MaterialTheme.typography.bodySmall,
                color = AppTheme.colors.textMuted,
                modifier = Modifier.padding(top = Spacing.xs)
            )
            Spacer(Modifier.height(Spacing.md))
            PrimaryButton(
                text = if (saving) "Saving…" else "Save",
                enabled = !saving && name.trim().length >= 2,
                onClick = {
                    scope.launch {
                        saving = true
                        val err = onSave(name, bio)
                        saving = false
                        if (err == null) {
                            Toast.makeText(context, "Profile saved", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        } else {
                            error = err
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun StatCell(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier.padding(vertical = Spacing.sm), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = AppTheme.colors.textPrimary, maxLines = 1)
        Text(label, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary, maxLines = 1)
    }
}

@Composable
private fun VerticalHairline() {
    Box(Modifier.fillMaxHeight().padding(vertical = Spacing.sm).width(1.dp).background(AppTheme.colors.divider))
}

@Composable
private fun CourseProgressItem(row: CourseProgressRow, divider: Boolean, onClick: () -> Unit) {
    val progress = if (row.total == 0) 0f else row.done.toFloat() / row.total
    Column {
        if (divider) Box(Modifier.padding(start = Spacing.md).fillMaxWidth().height(1.dp).background(AppTheme.colors.divider))
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(Spacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier
                    .width(72.dp)
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(Radius.xs))
                    .background(AppTheme.colors.thumbnailPlaceholder)
            ) {
                if (row.course.thumbnailUrl.isNotBlank()) {
                    AsyncImage(model = row.course.thumbnailUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
            }
            Spacer(Modifier.width(Spacing.sm))
            Column(Modifier.weight(1f)) {
                Text(row.course.title, style = MaterialTheme.typography.bodyLarge, color = AppTheme.colors.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${row.done} of ${row.total} lessons · ${(progress * 100).toInt()}%", style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary)
                Spacer(Modifier.height(6.dp))
                ProgressTrack(progress)
            }
            Spacer(Modifier.width(Spacing.xs))
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = AppTheme.colors.textMuted, modifier = Modifier.size(20.dp))
        }
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
