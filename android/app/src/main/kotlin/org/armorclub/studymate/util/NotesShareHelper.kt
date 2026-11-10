package org.armorclub.studymate.util

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.widget.Toast
import androidx.core.content.FileProvider
import org.armorclub.studymate.data.model.Note
import java.io.File

data class InstalledNoteApp(
    val packageName: String,
    val appName: String,
    val icon: Drawable? = null
)

object NotesShareHelper {

    private val KNOWN_NOTE_PACKAGES = listOf(
        "com.google.android.keep" to "Google Keep",
        "com.samsung.android.app.notes" to "Samsung Notes",
        "com.microsoft.office.onenote" to "OneNote",
        "notion.id" to "Notion",
        "md.obsidian" to "Obsidian",
        "com.evernote" to "Evernote",
        "net.gsantner.markor" to "Markor",
        "com.google.android.apps.docs" to "Google Docs"
    )

    fun openInExternalNotesApp(context: Context, note: Note) {
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "${note.courseTitle}: ${note.lessonTitle} - Notes")
            putExtra(Intent.EXTRA_TITLE, "${note.lessonTitle} Notes")
            putExtra(Intent.EXTRA_TEXT, formatNoteForSharing(note))
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        val chooser = Intent.createChooser(sendIntent, "Open Note In...").apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }

    fun openDirectlyInApp(context: Context, note: Note, targetPackage: String) {
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            setPackage(targetPackage)
            putExtra(Intent.EXTRA_SUBJECT, "${note.courseTitle}: ${note.lessonTitle}")
            putExtra(Intent.EXTRA_TEXT, formatNoteForSharing(note))
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            context.startActivity(sendIntent)
        } catch (e: Exception) {
            // Fallback to general chooser if direct intent fails
            openInExternalNotesApp(context, note)
        }
    }

    fun exportAsMarkdownFile(context: Context, note: Note) {
        try {
            val exportDir = File(context.cacheDir, "exported_notes").apply { mkdirs() }
            val safeName = "${note.lessonTitle.replace("[^a-zA-Z0-9.-]".toRegex(), "_")}.md"
            val file = File(exportDir, safeName)
            file.writeText(formatNoteForSharing(note))

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/markdown"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "${note.lessonTitle} Notes")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(shareIntent, "Share Markdown File").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
        } catch (e: Exception) {
            Toast.makeText(context, "Export failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    fun copyToClipboard(context: Context, note: Note) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("${note.lessonTitle} Notes", formatNoteForSharing(note))
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "Note copied to clipboard!", Toast.LENGTH_SHORT).show()
    }

    fun getInstalledNoteApps(context: Context): List<InstalledNoteApp> {
        val pm = context.packageManager
        val result = mutableListOf<InstalledNoteApp>()

        for ((pkg, defaultName) in KNOWN_NOTE_PACKAGES) {
            try {
                val appInfo = pm.getApplicationInfo(pkg, 0)
                val appName = pm.getApplicationLabel(appInfo).toString()
                val icon = pm.getApplicationIcon(appInfo)
                result.add(InstalledNoteApp(pkg, appName, icon))
            } catch (_: PackageManager.NameNotFoundException) {}
        }
        return result
    }

    private fun formatNoteForSharing(note: Note): String {
        return """
# ${note.courseTitle}
## ${note.lessonTitle}

${note.content}

---
Exported from StudyMate Native App
        """.trimIndent()
    }
}
