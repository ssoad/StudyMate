package org.armorclub.studymate.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.Icons
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItemColors
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationDrawerItemColors
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing

/*
 * StudyMate design kit. Screens should build from these instead of styling
 * Material components inline, so spacing, radii and colors stay consistent.
 */

// ---------------------------------------------------------------- Buttons

private val ButtonHeight = 44.dp
private val ButtonPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)

/** The one accent action on a screen. */
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = ButtonHeight),
        shape = RoundedCornerShape(Radius.control),
        contentPadding = ButtonPadding,
        colors = ButtonDefaults.buttonColors(
            containerColor = AppTheme.colors.primaryButton,
            contentColor = AppTheme.colors.onPrimaryButton,
            disabledContainerColor = AppTheme.colors.surfaceVariant,
            disabledContentColor = AppTheme.colors.textMuted
        ),
        elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp)
    ) { ButtonContent(text, icon) }
}

/** Default button: bordered, neutral. */
@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    contentColor: Color = AppTheme.colors.textPrimary
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = ButtonHeight),
        shape = RoundedCornerShape(Radius.control),
        contentPadding = ButtonPadding,
        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = AppTheme.colors.surface,
            contentColor = contentColor,
            disabledContentColor = AppTheme.colors.textMuted
        )
    ) { ButtonContent(text, icon) }
}

/** Low-emphasis text action. */
@Composable
fun GhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    contentColor: Color = AppTheme.colors.primary
) {
    TextButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(Radius.control),
        colors = ButtonDefaults.textButtonColors(contentColor = contentColor)
    ) { ButtonContent(text, icon) }
}

@Composable
private fun ButtonContent(text: String, icon: ImageVector?) {
    if (icon != null) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
    }
    Text(text, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
}

// ---------------------------------------------------------------- Surfaces

/** Flat card: surface fill + hairline border, no shadow. */
@Composable
fun SmCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    padding: Dp = Spacing.md,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(Radius.card)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(AppTheme.colors.cardBackground)
            .border(1.dp, AppTheme.colors.cardBorder, shape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(padding),
        content = content
    )
}

/** Section title with optional trailing action, used above lists. */
@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(top = Spacing.lg, bottom = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            color = AppTheme.colors.textPrimary,
            modifier = Modifier.weight(1f)
        )
        if (actionText != null && onAction != null) {
            Text(
                actionText,
                style = MaterialTheme.typography.labelLarge,
                color = AppTheme.colors.primary,
                modifier = Modifier.clip(RoundedCornerShape(Radius.xs)).clickable(onClick = onAction).padding(4.dp)
            )
        }
    }
}

/** Standard list row: leading slot, title/subtitle, trailing slot, divider below. */
@Composable
fun ListRow(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    selected: Boolean = false,
    showDivider: Boolean = true,
    titleColor: Color = AppTheme.colors.textPrimary,
    onClick: (() -> Unit)? = null,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable RowScope.() -> Unit)? = null
) {
    Column(modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(Radius.control))
                .background(if (selected) AppTheme.colors.primaryContainer else Color.Transparent)
                .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
                .padding(horizontal = if (selected) Spacing.sm else 0.dp, vertical = Spacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (leading != null) {
                leading()
                Spacer(Modifier.width(Spacing.sm))
            }
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = if (selected) MaterialTheme.typography.titleSmall.fontWeight else androidx.compose.ui.text.font.FontWeight.Normal
                    ),
                    color = if (selected) AppTheme.colors.textPrimary else titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (subtitle != null) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = AppTheme.colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (trailing != null) {
                Spacer(Modifier.width(Spacing.xs))
                trailing()
            }
        }
        if (showDivider && !selected) {
            Box(Modifier.fillMaxWidth().height(1.dp).background(AppTheme.colors.divider))
        }
    }
}

// ---------------------------------------------------------------- Small pieces

enum class BadgeTone { Neutral, Accent, Success, Warning, Danger }

/** Small status label. Sentence case, never all-caps. */
@Composable
fun Badge(text: String, tone: BadgeTone = BadgeTone.Neutral, modifier: Modifier = Modifier) {
    val c = AppTheme.colors
    val (bg, fg) = when (tone) {
        BadgeTone.Neutral -> c.surfaceVariant to c.textSecondary
        BadgeTone.Accent -> c.primaryContainer to c.onPrimaryContainer
        BadgeTone.Success -> c.successContainer to c.success
        BadgeTone.Warning -> c.warningContainer to c.warning
        BadgeTone.Danger -> c.errorContainer to c.error
    }
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = fg,
        maxLines = 1,
        modifier = modifier
            .clip(RoundedCornerShape(Radius.xs))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

/** Filter chip: filled neutral-dark when selected, outlined otherwise. */
@Composable
fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = AppTheme.colors
    val shape = RoundedCornerShape(50)
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = if (selected) c.background else c.textSecondary,
        maxLines = 1,
        modifier = modifier
            .clip(shape)
            .background(if (selected) c.textPrimary else Color.Transparent)
            .border(1.dp, if (selected) c.textPrimary else c.cardBorder, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    )
}

/** Thin progress track. */
@Composable
fun ProgressTrack(progress: Float, modifier: Modifier = Modifier, color: Color = AppTheme.colors.primary) {
    val p = progress.coerceIn(0f, 1f)
    Box(
        modifier
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(AppTheme.colors.divider)
    ) {
        if (p > 0f) {
            Box(
                Modifier
                    .fillMaxWidth(p)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(color)
            )
        }
    }
}

/** Initials avatar on an accent tint. */
@Composable
fun InitialsAvatar(name: String?, size: Dp = 36.dp, modifier: Modifier = Modifier) {
    val initials = name.orEmpty().trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        .take(2).joinToString("") { it.first().uppercase() }.ifBlank { "?" }
    Box(
        modifier
            .size(size)
            .clip(CircleShape)
            .background(AppTheme.colors.primaryContainer),
        contentAlignment = Alignment.Center
    ) {
        Text(
            initials,
            color = AppTheme.colors.onPrimaryContainer,
            style = if (size >= 48.dp) MaterialTheme.typography.titleLarge else MaterialTheme.typography.titleSmall
        )
    }
}

/** Rounded square icon holder for settings rows and empty states. */
@Composable
fun IconTile(icon: ImageVector, modifier: Modifier = Modifier, tint: Color = AppTheme.colors.textSecondary, size: Dp = 36.dp) {
    Box(
        modifier
            .size(size)
            .clip(RoundedCornerShape(Radius.control))
            .background(AppTheme.colors.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(size * 0.5f))
    }
}

/** Empty state: icon, headline, one line of body, optional action. */
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier.fillMaxWidth().padding(horizontal = Spacing.lg, vertical = Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        IconTile(icon, size = 48.dp)
        Spacer(Modifier.height(Spacing.xxs))
        Text(title, style = MaterialTheme.typography.titleMedium, color = AppTheme.colors.textPrimary)
        Text(
            body,
            style = MaterialTheme.typography.bodyMedium,
            color = AppTheme.colors.textSecondary,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        if (actionText != null && onAction != null) {
            Spacer(Modifier.height(Spacing.xs))
            SecondaryButton(actionText, onAction)
        }
    }
}

/** Hairline divider. */
@Composable
fun Hairline(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(AppTheme.colors.divider))
}

// ---------------------------------------------------------------- Nav colors

@Composable
fun smNavBarItemColors(): NavigationBarItemColors = NavigationBarItemDefaults.colors(
    selectedIconColor = AppTheme.colors.primary,
    selectedTextColor = AppTheme.colors.textPrimary,
    indicatorColor = AppTheme.colors.primaryContainer,
    unselectedIconColor = AppTheme.colors.textMuted,
    unselectedTextColor = AppTheme.colors.textMuted
)

@Composable
fun smDrawerItemColors(): NavigationDrawerItemColors = NavigationDrawerItemDefaults.colors(
    selectedContainerColor = AppTheme.colors.primaryContainer,
    unselectedContainerColor = Color.Transparent,
    selectedTextColor = AppTheme.colors.onPrimaryContainer,
    unselectedTextColor = AppTheme.colors.textPrimary,
    selectedIconColor = AppTheme.colors.onPrimaryContainer,
    unselectedIconColor = AppTheme.colors.textSecondary
)

/** Top-level screen header: large title, optional subtitle and trailing actions. */
@Composable
fun ScreenHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    leading: (@Composable () -> Unit)? = null,
    actions: (@Composable RowScope.() -> Unit)? = null
) {
    Row(
        modifier.fillMaxWidth().padding(start = if (leading != null) Spacing.xxs else Spacing.gutter, end = Spacing.xs, top = Spacing.sm, bottom = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (leading != null) {
            leading()
            Spacer(Modifier.width(Spacing.xxs))
        }
        Column(Modifier.weight(1f)) {
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary)
            }
            Text(title, style = MaterialTheme.typography.headlineMedium, color = AppTheme.colors.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (actions != null) Row(verticalAlignment = Alignment.CenterVertically, content = actions)
    }
}

/** Dialog body used by the simple informational dialogs. */
@Composable
fun SmDialogCard(content: @Composable ColumnScope.() -> Unit) {
    Surface(
        shape = RoundedCornerShape(Radius.sheet),
        color = AppTheme.colors.surfaceElevated,
        border = BorderStroke(1.dp, AppTheme.colors.cardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(Spacing.lg), content = content)
    }
}

// ---------------------------------------------------------------- Inputs

@Composable
fun SearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search"
) {
    val shape = RoundedCornerShape(Radius.control)
    Row(
        modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(shape)
            .background(AppTheme.colors.surface)
            .border(1.dp, AppTheme.colors.cardBorder, shape)
            .padding(horizontal = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Outlined.Search, contentDescription = null, tint = AppTheme.colors.textMuted, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(Spacing.xs))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(placeholder, style = MaterialTheme.typography.bodyLarge, color = AppTheme.colors.textMuted)
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = AppTheme.colors.textPrimary),
                cursorBrush = SolidColor(AppTheme.colors.primary),
                modifier = Modifier.fillMaxWidth()
            )
        }
        if (value.isNotEmpty()) {
            Icon(
                Icons.Outlined.Close,
                contentDescription = "Clear search",
                tint = AppTheme.colors.textMuted,
                modifier = Modifier.size(20.dp).clip(RoundedCornerShape(50)).clickable { onValueChange("") }
            )
        }
    }
}
