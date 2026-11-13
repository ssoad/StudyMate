package org.armorclub.studymate.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * StudyMate design tokens — "clean & minimal".
 *
 * One neutral ramp (zinc), one accent (indigo-blue), status colors used only for status.
 * The same values live in the web app's `src/index.css` (@theme) — keep them in sync.
 *
 * Field names predate the redesign and are kept so every screen reads from one place;
 * several legacy fields now alias the same token on purpose (e.g. primaryButton == primary).
 */
@Immutable
data class StudyMateColors(
    val isDark: Boolean,
    // Surfaces
    val background: Color,        // page canvas
    val surface: Color,           // cards, sheets, bars
    val surfaceElevated: Color,   // dialogs, menus
    val surfaceVariant: Color,    // inputs, chips, subtle fills
    val cardBackground: Color,
    val cardBorder: Color,        // hairline borders
    val divider: Color,           // list separators (lighter than borders)
    // Text
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    // Accent
    val primary: Color,
    val onPrimary: Color,
    val primaryButton: Color,
    val onPrimaryButton: Color,
    val primaryContainer: Color,  // selected rows, accent-tinted chips
    val onPrimaryContainer: Color,
    val secondary: Color,
    val accent: Color,
    // Status
    val success: Color,
    val successContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val error: Color,
    val errorContainer: Color,
    // Chrome
    val chipBackground: Color,
    val bottomNavBackground: Color,
    val topAppBarBackground: Color,
    val drawerBackground: Color,
    val cardGradientStart: Color,
    val cardGradientEnd: Color,
    val playerOverlay: Color,
    val thumbnailPlaceholder: Color
)

object Palette {
    // Neutral (zinc)
    val N0 = Color(0xFFFFFFFF)
    val N25 = Color(0xFFFAFAFA)
    val N50 = Color(0xFFF4F4F5)
    val N100 = Color(0xFFEDEDF0)
    val N200 = Color(0xFFE7E7EA)
    val N300 = Color(0xFFD4D4D8)
    val N400 = Color(0xFFA1A1AA)
    val N500 = Color(0xFF71717A)
    val N600 = Color(0xFF52525B)
    val N700 = Color(0xFF3F3F46)
    val N750 = Color(0xFF2E2E34)
    val N800 = Color(0xFF26262B)
    val N850 = Color(0xFF1C1C20)
    val N900 = Color(0xFF131316)
    val N950 = Color(0xFF09090B)

    // Accent (indigo-blue)
    val Accent = Color(0xFF4F5BD5)
    val AccentDark = Color(0xFF8B93F8)
    val AccentTintLight = Color(0xFFEEF0FB)
    val AccentTextLight = Color(0xFF3A44B0)
    val AccentTintDark = Color(0xFF1B1C2B)
    val AccentTextDark = Color(0xFFC3C7FB)

    // Status
    val Green = Color(0xFF16A34A)
    val GreenDark = Color(0xFF22C55E)
    val Amber = Color(0xFFD97706)
    val AmberDark = Color(0xFFF59E0B)
    val Red = Color(0xFFDC2626)
    val RedDark = Color(0xFFF87171)
}

val LightColors = StudyMateColors(
    isDark = false,
    background = Palette.N25,
    surface = Palette.N0,
    surfaceElevated = Palette.N0,
    surfaceVariant = Palette.N50,
    cardBackground = Palette.N0,
    cardBorder = Palette.N200,
    divider = Palette.N100,
    textPrimary = Color(0xFF18181B),
    textSecondary = Palette.N500,
    textMuted = Palette.N400,
    primary = Palette.Accent,
    onPrimary = Palette.N0,
    primaryButton = Palette.Accent,
    onPrimaryButton = Palette.N0,
    primaryContainer = Palette.AccentTintLight,
    onPrimaryContainer = Palette.AccentTextLight,
    secondary = Palette.N600,
    accent = Palette.Accent,
    success = Palette.Green,
    successContainer = Color(0xFFE8F6EC),
    warning = Palette.Amber,
    warningContainer = Color(0xFFFDF3E3),
    error = Palette.Red,
    errorContainer = Color(0xFFFCECEC),
    chipBackground = Palette.N50,
    bottomNavBackground = Palette.N0,
    topAppBarBackground = Palette.N25,
    drawerBackground = Palette.N0,
    cardGradientStart = Palette.N0,
    cardGradientEnd = Palette.N0,
    playerOverlay = Color(0xCC000000),
    thumbnailPlaceholder = Palette.N100
)

/** Soft dark (default dark). */
val DarkColors = StudyMateColors(
    isDark = true,
    background = Palette.N950,
    surface = Palette.N900,
    surfaceElevated = Palette.N850,
    surfaceVariant = Palette.N850,
    cardBackground = Palette.N900,
    cardBorder = Palette.N800,
    divider = Palette.N850,
    textPrimary = Palette.N50,
    textSecondary = Palette.N400,
    textMuted = Palette.N500,
    primary = Palette.AccentDark,
    onPrimary = Palette.N950,
    primaryButton = Palette.AccentDark,
    onPrimaryButton = Palette.N950,
    primaryContainer = Palette.AccentTintDark,
    onPrimaryContainer = Palette.AccentTextDark,
    secondary = Palette.N400,
    accent = Palette.AccentDark,
    success = Palette.GreenDark,
    successContainer = Color(0xFF12261A),
    warning = Palette.AmberDark,
    warningContainer = Color(0xFF2A1F0B),
    error = Palette.RedDark,
    errorContainer = Color(0xFF2C1415),
    chipBackground = Palette.N850,
    bottomNavBackground = Palette.N950,
    topAppBarBackground = Palette.N950,
    drawerBackground = Palette.N900,
    cardGradientStart = Palette.N900,
    cardGradientEnd = Palette.N900,
    playerOverlay = Color(0xCC000000),
    thumbnailPlaceholder = Palette.N850
)

/** Pure-black variant for OLED screens. Same tokens, canvas at #000. */
val AmoledDarkColors = DarkColors.copy(
    background = Color(0xFF000000),
    surface = Color(0xFF0C0C0E),
    cardBackground = Color(0xFF0C0C0E),
    surfaceElevated = Palette.N900,
    surfaceVariant = Palette.N900,
    chipBackground = Palette.N900,
    divider = Palette.N900,
    cardBorder = Palette.N850,
    bottomNavBackground = Color(0xFF000000),
    topAppBarBackground = Color(0xFF000000),
    drawerBackground = Color(0xFF0C0C0E),
    cardGradientStart = Color(0xFF0C0C0E),
    cardGradientEnd = Color(0xFF0C0C0E),
    thumbnailPlaceholder = Palette.N900
)

// Kept for source compatibility with code that referenced the old name.
val ModernLightColors = LightColors

val LocalStudyMateColors = staticCompositionLocalOf { DarkColors }

object AppTheme {
    val colors: StudyMateColors
        @Composable
        get() = LocalStudyMateColors.current
}
