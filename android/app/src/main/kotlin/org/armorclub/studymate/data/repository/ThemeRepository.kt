package org.armorclub.studymate.data.repository

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemeMode(val title: String, val description: String) {
    AMOLED_DARK(
        title = "AMOLED Dark",
        description = "Pitch black (#000000) for OLED panels to turn pixels off & maximize battery"
    ),
    LIGHT(
        title = "Light Mode",
        description = "Clean modern slate & pure white cards for comfortable daylight reading"
    ),
    SYSTEM(
        title = "System Default",
        description = "Automatically match your Android device's system dark/light mode"
    )
}

class ThemeRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _themeMode = MutableStateFlow(loadThemeMode())
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    private fun loadThemeMode(): ThemeMode {
        val saved = prefs.getString(KEY_THEME_MODE, ThemeMode.AMOLED_DARK.name)
        return try {
            ThemeMode.valueOf(saved ?: ThemeMode.AMOLED_DARK.name)
        } catch (e: Exception) {
            ThemeMode.AMOLED_DARK
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME_MODE, mode.name).apply()
        _themeMode.value = mode
    }

    fun toggleTheme() {
        val current = _themeMode.value
        val next = when (current) {
            ThemeMode.AMOLED_DARK -> ThemeMode.LIGHT
            ThemeMode.LIGHT -> ThemeMode.AMOLED_DARK
            ThemeMode.SYSTEM -> ThemeMode.AMOLED_DARK
        }
        setThemeMode(next)
    }

    companion object {
        private const val PREFS_NAME = "studymate_theme_prefs"
        private const val KEY_THEME_MODE = "key_theme_mode"
    }
}
