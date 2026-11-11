package org.armorclub.studymate.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class StudyMateColors(
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val surfaceVariant: Color,
    val cardBackground: Color,
    val cardBorder: Color,
    val divider: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val primary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,
    val secondary: Color,
    val accent: Color,
    val success: Color,
    val successContainer: Color,
    val warning: Color,
    val error: Color,
    val chipBackground: Color,
    val bottomNavBackground: Color,
    val topAppBarBackground: Color,
    val drawerBackground: Color,
    val cardGradientStart: Color,
    val cardGradientEnd: Color,
    val playerOverlay: Color
)

// AMOLED Dark Palette: True Pitch-Black #000000, Deep Obsidian Cards, Crisp Sky Blue Accents
val AmoledDarkColors = StudyMateColors(
    isDark = true,
    background = Color(0xFF000000),             // 100% True Black (Pixels off on OLED)
    surface = Color(0xFF090B10),                // Deep Obsidian
    surfaceElevated = Color(0xFF10131B),        // Elevated surfaces / modals
    surfaceVariant = Color(0xFF141824),         // Variant cards / search bar
    cardBackground = Color(0xFF0A0D15),         // Dark card base
    cardBorder = Color(0xFF1E2433),             // Subtle dark border
    divider = Color(0xFF181D29),                // Clean divider line
    textPrimary = Color(0xFFFFFFFF),            // Crisp white
    textSecondary = Color(0xFF94A3B8),          // Slate 400
    textMuted = Color(0xFF64748B),              // Slate 500
    primary = Color(0xFF38BDF8),                // Sky 400 (Vibrant on pure black)
    primaryContainer = Color(0xFF0284C7),       // Sky 600
    onPrimaryContainer = Color(0xFFFFFFFF),
    secondary = Color(0xFF818CF8),              // Indigo 400
    accent = Color(0xFF38BDF8),
    success = Color(0xFF10B981),                // Emerald 500
    successContainer = Color(0xFF064E3B),       // Deep Emerald
    warning = Color(0xFFF59E0B),                // Amber 500
    error = Color(0xFFEF4444),                  // Red 500
    chipBackground = Color(0xFF101420),
    bottomNavBackground = Color(0xFF000000),    // Pure black bottom bar
    topAppBarBackground = Color(0xFF000000),    // Pure black top bar
    drawerBackground = Color(0xFF05060A),       // Pitch-black drawer
    cardGradientStart = Color(0xFF0A0D15),
    cardGradientEnd = Color(0xFF101420),
    playerOverlay = Color(0xE6000000)
)

// Clean Modern Light Palette: Soft Slate 50 Background, Pure White Cards, Rich Slate Typography
val ModernLightColors = StudyMateColors(
    isDark = false,
    background = Color(0xFFF8FAFC),             // Slate 50
    surface = Color(0xFFFFFFFF),                // Pure White
    surfaceElevated = Color(0xFFFFFFFF),        // White elevated
    surfaceVariant = Color(0xFFF1F5F9),         // Slate 100
    cardBackground = Color(0xFFFFFFFF),         // Crisp White
    cardBorder = Color(0xFFE2E8F0),             // Slate 200 border
    divider = Color(0xFFE2E8F0),                // Slate 200 divider
    textPrimary = Color(0xFF0F172A),            // Slate 900
    textSecondary = Color(0xFF475569),          // Slate 600
    textMuted = Color(0xFF94A3B8),              // Slate 400
    primary = Color(0xFF0284C7),                // Sky 600
    primaryContainer = Color(0xFFE0F2FE),       // Sky 100
    onPrimaryContainer = Color(0xFF0369A1),     // Sky 700
    secondary = Color(0xFF4F46E5),              // Indigo 600
    accent = Color(0xFF0284C7),
    success = Color(0xFF059669),                // Emerald 600
    successContainer = Color(0xFFD1FAE5),       // Light Emerald
    warning = Color(0xFFD97706),                // Amber 600
    error = Color(0xFFDC2626),                  // Red 600
    chipBackground = Color(0xFFF1F5F9),
    bottomNavBackground = Color(0xFFFFFFFF),    // Clean white bottom bar
    topAppBarBackground = Color(0xFFFFFFFF),    // Clean white top bar
    drawerBackground = Color(0xFFFFFFFF),       // Clean white drawer
    cardGradientStart = Color(0xFFFFFFFF),
    cardGradientEnd = Color(0xFFF8FAFC),
    playerOverlay = Color(0xE60F172A)
)

val LocalStudyMateColors = staticCompositionLocalOf { AmoledDarkColors }

object AppTheme {
    val colors: StudyMateColors
        @Composable
        get() = LocalStudyMateColors.current
}
