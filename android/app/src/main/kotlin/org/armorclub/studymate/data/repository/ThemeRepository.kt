package org.armorclub.studymate.data.repository

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemeMode(val title: String, val description: String) {
    SYSTEM(title = "System", description = "Match your device setting"),
    LIGHT(title = "Light", description = "Light background for daytime reading"),
    DARK(title = "Dark", description = "Soft dark background, easy on the eyes"),
    AMOLED_DARK(title = "Black", description = "Pure black for OLED screens, saves battery")
}

class ThemeRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _themeMode = MutableStateFlow(loadThemeMode())
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    private fun loadThemeMode(): ThemeMode {
        val saved = prefs.getString(KEY_THEME_MODE, ThemeMode.SYSTEM.name)
        return try {
            ThemeMode.valueOf(saved ?: ThemeMode.SYSTEM.name)
        } catch (e: Exception) {
            ThemeMode.SYSTEM
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME_MODE, mode.name).apply()
        _themeMode.value = mode
    }

    fun toggleTheme() {
        val current = _themeMode.value
        val next = when (current) {
            ThemeMode.LIGHT -> ThemeMode.DARK
            ThemeMode.DARK, ThemeMode.AMOLED_DARK -> ThemeMode.LIGHT
            ThemeMode.SYSTEM -> ThemeMode.DARK
        }
        setThemeMode(next)
    }

    companion object {
        private const val PREFS_NAME = "studymate_theme_prefs"
        private const val KEY_THEME_MODE = "key_theme_mode"
    }
}
