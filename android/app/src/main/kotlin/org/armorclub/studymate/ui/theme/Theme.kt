package org.armorclub.studymate.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val AmoledDarkMaterialScheme = darkColorScheme(
    primary = Color(0xFF38BDF8),
    onPrimary = Color(0xFF000000),
    primaryContainer = Color(0xFF0284C7),
    onPrimaryContainer = Color(0xFFFFFFFF),
    secondary = Color(0xFF818CF8),
    onSecondary = Color(0xFF000000),
    secondaryContainer = Color(0xFF312E81),
    onSecondaryContainer = Color(0xFFE0E7FF),
    tertiary = Color(0xFF10B981),
    onTertiary = Color(0xFF000000),
    background = Color(0xFF000000),
    onBackground = Color(0xFFFFFFFF),
    surface = Color(0xFF090B10),
    onSurface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFF141824),
    onSurfaceVariant = Color(0xFF94A3B8),
    surfaceContainer = Color(0xFF0A0D15),
    surfaceContainerHigh = Color(0xFF10131B),
    surfaceContainerHighest = Color(0xFF141824),
    outline = Color(0xFF1E2433),
    outlineVariant = Color(0xFF181D29),
    error = Color(0xFFEF4444),
    onError = Color(0xFFFFFFFF)
)

private val LightMaterialScheme = lightColorScheme(
    primary = Color(0xFF0284C7),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFE0F2FE),
    onPrimaryContainer = Color(0xFF0369A1),
    secondary = Color(0xFF4F46E5),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFEEF2FF),
    onSecondaryContainer = Color(0xFF3730A3),
    tertiary = Color(0xFF059669),
    onTertiary = Color(0xFFFFFFFF),
    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF0F172A),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerHigh = Color(0xFFF8FAFC),
    surfaceContainerHighest = Color(0xFFF1F5F9),
    outline = Color(0xFFCBD5E1),
    outlineVariant = Color(0xFFE2E8F0),
    error = Color(0xFFDC2626),
    onError = Color(0xFFFFFFFF)
)

@Composable
fun StudyMateTheme(
    isDark: Boolean = true,
    content: @Composable () -> Unit
) {
    val appColors = if (isDark) AmoledDarkColors else ModernLightColors
    val materialScheme = if (isDark) AmoledDarkMaterialScheme else LightMaterialScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !isDark
                insetsController.isAppearanceLightNavigationBars = !isDark
            }
        }
    }

    CompositionLocalProvider(LocalStudyMateColors provides appColors) {
        MaterialTheme(
            colorScheme = materialScheme,
            typography = Typography,
            content = content
        )
    }
}
