package org.armorclub.studymate.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.armorclub.studymate.ui.theme.AppTheme

@Composable
fun MarkdownView(
    markdown: String,
    modifier: Modifier = Modifier,
    onTimestampClick: (Long) -> Unit = {}
) {
    val lines = markdown.lines()
    var inCodeBlock = false
    val codeBlockBuilder = StringBuilder()

    Column(modifier = modifier) {
        for (line in lines) {
            val trimmed = line.trim()

            if (trimmed.startsWith("```")) {
                if (inCodeBlock) {
                    // End code block
                    CodeBlock(code = codeBlockBuilder.toString().trimEnd())
                    codeBlockBuilder.clear()
                    inCodeBlock = false
                } else {
                    inCodeBlock = true
                }
                continue
            }

            if (inCodeBlock) {
                codeBlockBuilder.append(line).append("\n")
                continue
            }

            when {
                trimmed.startsWith("# ") -> {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = trimmed.removePrefix("# "),
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = AppTheme.colors.primary
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                trimmed.startsWith("## ") -> {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = trimmed.removePrefix("## "),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = AppTheme.colors.textPrimary
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                trimmed.startsWith("### ") -> {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = trimmed.removePrefix("### "),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Medium,
                            color = AppTheme.colors.textSecondary
                        )
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }
                trimmed.startsWith("- [ ]") -> {
                    ChecklistItem(
                        text = trimmed.removePrefix("- [ ]").trim(),
                        isChecked = false
                    )
                }
                trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]") -> {
                    ChecklistItem(
                        text = trimmed.removePrefix("- [x]").removePrefix("- [X]").trim(),
                        isChecked = true
                    )
                }
                trimmed.startsWith("- ") || trimmed.startsWith("* ") -> {
                    BulletItem(
                        text = trimmed.substring(2).trim(),
                        onTimestampClick = onTimestampClick
                    )
                }
                trimmed.isBlank() -> {
                    Spacer(modifier = Modifier.height(8.dp))
                }
                else -> {
                    ParagraphText(
                        text = trimmed,
                        onTimestampClick = onTimestampClick
                    )
                }
            }
        }

        if (inCodeBlock && codeBlockBuilder.isNotEmpty()) {
            CodeBlock(code = codeBlockBuilder.toString().trimEnd())
        }
    }
}

@Composable
private fun BulletItem(text: String, onTimestampClick: (Long) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = "•",
            style = MaterialTheme.typography.bodyLarge.copy(
                color = AppTheme.colors.primary,
                fontWeight = FontWeight.Bold
            ),
            modifier = Modifier.padding(end = 8.dp, start = 4.dp)
        )
        TimestampedText(text = text, onTimestampClick = onTimestampClick)
    }
}

@Composable
private fun ChecklistItem(text: String, isChecked: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = if (isChecked) "☑" else "☐",
            style = MaterialTheme.typography.bodyLarge.copy(
                color = if (isChecked) AppTheme.colors.primary else AppTheme.colors.textSecondary,
                fontSize = 16.sp
            ),
            modifier = Modifier.padding(end = 8.dp)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = if (isChecked) AppTheme.colors.textSecondary else AppTheme.colors.textPrimary
            )
        )
    }
}

@Composable
private fun ParagraphText(text: String, onTimestampClick: (Long) -> Unit) {
    Box(modifier = Modifier.padding(vertical = 2.dp)) {
        TimestampedText(text = text, onTimestampClick = onTimestampClick)
    }
}

@Composable
private fun TimestampedText(text: String, onTimestampClick: (Long) -> Unit) {
    val timestampRegex = "\\[(\\d{1,2}:\\d{2}(?::\\d{2})?)\\]".toRegex()
    val match = timestampRegex.find(text)

    if (match != null) {
        val timestampStr = match.groupValues[1]
        val seconds = parseTimestampToSeconds(timestampStr)
        val before = text.substring(0, match.range.first)
        val after = text.substring(match.range.last + 1)

        Row(verticalAlignment = Alignment.CenterVertically) {
            if (before.isNotBlank()) {
                Text(text = before, style = MaterialTheme.typography.bodyMedium)
            }
            Box(
                modifier = Modifier
                    .padding(horizontal = 4.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(AppTheme.colors.primaryContainer)
                    .clickable { onTimestampClick(seconds * 1000L) }
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "▶ $timestampStr",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.colors.onPrimaryContainer
                    )
                )
            }
            if (after.isNotBlank()) {
                Text(text = after, style = MaterialTheme.typography.bodyMedium)
            }
        }
    } else {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium.copy(
                lineHeight = 22.sp,
                color = AppTheme.colors.textPrimary
            )
        )
    }
}

@Composable
private fun CodeBlock(code: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF1E1E2E))
            .border(1.dp, Color(0xFF313244), RoundedCornerShape(8.dp))
            .padding(12.dp)
    ) {
        Text(
            text = code,
            style = MaterialTheme.typography.bodySmall.copy(
                fontFamily = FontFamily.Monospace,
                color = Color(0xFFCDD6F4),
                lineHeight = 18.sp
            )
        )
    }
}

private fun parseTimestampToSeconds(str: String): Long {
    val parts = str.split(":").mapNotNull { it.toLongOrNull() }
    return when (parts.size) {
        2 -> parts[0] * 60 + parts[1]
        3 -> parts[0] * 3600 + parts[1] * 60 + parts[2]
        else -> 0L
    }
}
