package org.armorclub.studymate.data.repository

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.armorclub.studymate.data.model.Note
import java.io.File

class NotesRepository(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true }
    private val notesDir = File(context.filesDir, "notes").apply { mkdirs() }

    private val _notesFlow = MutableStateFlow<Map<String, Note>>(emptyMap())
    val notesFlow: StateFlow<Map<String, Note>> = _notesFlow.asStateFlow()

    init {
        loadAllNotes()
    }

    private fun loadAllNotes() {
        val map = mutableMapOf<String, Note>()
        val files = notesDir.listFiles { file -> file.extension == "json" } ?: emptyArray()
        for (file in files) {
            try {
                val content = file.readText()
                val note: Note = json.decodeFromString(content)
                map[note.lessonId] = note
            } catch (_: Exception) {}
        }
        _notesFlow.value = map
    }

    suspend fun getNote(lessonId: String, courseId: String = "", lessonTitle: String = "", courseTitle: String = ""): Note = withContext(Dispatchers.IO) {
        val existing = _notesFlow.value[lessonId]
        if (existing != null) return@withContext existing

        val file = File(notesDir, "$lessonId.json")
        if (file.exists()) {
            try {
                val note: Note = json.decodeFromString(file.readText())
                val updated = _notesFlow.value.toMutableMap()
                updated[lessonId] = note
                _notesFlow.value = updated
                return@withContext note
            } catch (_: Exception) {}
        }

        // Return a starter template note with helpful markdown structure
        val starterContent = """
# $lessonTitle
Course: $courseTitle
Date: ${java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())}

## 📌 Key Objectives & Overview
- [ ] Understand core principles discussed in this lecture.
- [ ] Review implementation details and syntax patterns.

## 📝 Lecture Notes
*Click timestamp [00:00] to jump video to that moment.*

- [00:00] Introduction and lecture roadmap.
- 

## 💡 Code Snippets / Key Formulas
```
// Write notes, code snippets, or interview questions here
```

## 🎯 Summary & Key Takeaways
- 
        """.trimIndent()

        val newNote = Note(
            id = "note-$lessonId",
            lessonId = lessonId,
            courseId = courseId,
            lessonTitle = lessonTitle,
            courseTitle = courseTitle,
            content = starterContent
        )
        saveNote(newNote)
        newNote
    }

    suspend fun saveNote(note: Note) = withContext(Dispatchers.IO) {
        val file = File(notesDir, "${note.lessonId}.json")
        val updatedNote = note.copy(updatedAt = System.currentTimeMillis())
        file.writeText(json.encodeToString(updatedNote))

        val current = _notesFlow.value.toMutableMap()
        current[note.lessonId] = updatedNote
        _notesFlow.value = current
    }

    suspend fun getAllNotes(): List<Note> = withContext(Dispatchers.IO) {
        _notesFlow.value.values.sortedByDescending { it.updatedAt }
    }
}
