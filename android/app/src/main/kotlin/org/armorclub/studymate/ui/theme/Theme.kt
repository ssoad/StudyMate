package org.armorclub.studymate.ui.theme

import android.app.Activity
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

/** Spacing scale: 4 · 8 · 12 · 16 · 24 · 32. Screen gutter is 16dp (lg is 24dp on tablets). */
@Immutable
object Spacing {
    val xxs: Dp = 4.dp
    val xs: Dp = 8.dp
    val sm: Dp = 12.dp
    val md: Dp = 16.dp
    val lg: Dp = 24.dp
    val xl: Dp = 32.dp
    val gutter: Dp = 16.dp
}

/** Corner radii: 10 for controls, 14 for cards, 20 for sheets. */
@Immutable
object Radius {
    val xs: Dp = 6.dp
    val control: Dp = 10.dp
    val card: Dp = 14.dp
    val sheet: Dp = 20.dp
}

val StudyMateShapes = Shapes(
    extraSmall = RoundedCornerShape(Radius.xs),
    small = RoundedCornerShape(Radius.control),
    medium = RoundedCornerShape(Radius.card),
    large = RoundedCornerShape(Radius.sheet),
    extraLarge = RoundedCornerShape(Radius.sheet)
)

private fun StudyMateColors.toMaterial(): ColorScheme {
    val base = if (isDark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = primaryContainer,
        onPrimaryContainer = onPrimaryContainer,
        inversePrimary = primary,
        secondary = textSecondary,
        onSecondary = surface,
        secondaryContainer = primaryContainer,     // M3 nav bar / chip selection pill
        onSecondaryContainer = onPrimaryContainer,
        tertiary = success,
        onTertiary = surface,
        background = background,
        onBackground = textPrimary,
        surface = surface,
        onSurface = textPrimary,
        surfaceVariant = surfaceVariant,
        onSurfaceVariant = textSecondary,
        surfaceTint = surface,                     // no tonal elevation tint
        surfaceBright = surfaceElevated,
        surfaceDim = background,
        surfaceContainerLowest = background,
        surfaceContainerLow = surface,
        surfaceContainer = surface,
        surfaceContainerHigh = surfaceElevated,
        surfaceContainerHighest = surfaceVariant,
        outline = cardBorder,
        outlineVariant = divider,
        error = error,
        onError = surface,
        errorContainer = errorContainer,
        onErrorContainer = error,
        scrim = playerOverlay
    )
}

@Composable
fun StudyMateTheme(
    isDark: Boolean = true,
    amoled: Boolean = false,
    content: @Composable () -> Unit
) {
    val appColors = when {
        !isDark -> LightColors
        amoled -> AmoledDarkColors
        else -> DarkColors
    }
    val materialScheme = remember(appColors) { appColors.toMaterial() }

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
            shapes = StudyMateShapes,
            content = content
        )
    }
}

// Unused but handy for previews of a single token set.
internal val LocalPreviewDark = staticCompositionLocalOf { true }
