package com.kunal.os

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONObject

object WidgetStorage {
    const val PREFS_NAME = "kunal_os_widget_prefs"
    const val ENCRYPTED_PREFS_NAME = "kunal_os_widget_secure_prefs"
    const val KEY_SNAPSHOT = "widget_snapshot"
    const val KEY_LAST_UPDATED = "last_updated_time"
    const val KEY_TOKEN = "widget_bearer_token"
    private const val STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000L // 6 hours

    fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Throws(Exception::class)
    private fun getEncryptedPrefs(context: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            ENCRYPTED_PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // --- Token Management (Android Keystore / EncryptedSharedPreferences) ---

    @Throws(Exception::class)
    fun saveToken(context: Context, token: String) {
        getEncryptedPrefs(context).edit()
            .putString(KEY_TOKEN, token.trim())
            .apply()
    }

    fun getToken(context: Context): String? {
        return try {
            val token = getEncryptedPrefs(context).getString(KEY_TOKEN, null)
            if (token.isNullOrBlank()) null else token
        } catch (e: Exception) {
            null
        }
    }

    fun clearToken(context: Context) {
        try {
            getEncryptedPrefs(context).edit()
                .remove(KEY_TOKEN)
                .apply()
        } catch (e: Exception) {
            // Clear attempts should not crash
        }
    }

    fun hasToken(context: Context): Boolean {
        return getToken(context) != null
    }

    // --- Snapshot Management ---

    fun saveSnapshot(context: Context, json: String) {
        getPrefs(context).edit()
            .putString(KEY_SNAPSHOT, json)
            .putLong(KEY_LAST_UPDATED, System.currentTimeMillis())
            .apply()
    }

    fun clearSnapshot(context: Context) {
        getPrefs(context).edit()
            .remove(KEY_SNAPSHOT)
            .remove(KEY_LAST_UPDATED)
            .apply()
    }

    fun getSnapshot(context: Context): JSONObject? {
        val json = getPrefs(context).getString(KEY_SNAPSHOT, null) ?: return null
        return try {
            JSONObject(json)
        } catch (e: Exception) {
            null
        }
    }

    @JvmStatic
    fun getLastUpdatedTime(context: Context): Long {
        return getPrefs(context).getLong(KEY_LAST_UPDATED, 0L)
    }

    fun isStale(lastUpdated: Long): Boolean {
        if (lastUpdated <= 0L) return true
        return (System.currentTimeMillis() - lastUpdated) > STALE_THRESHOLD_MS
    }

    fun formatRelativeTime(lastUpdated: Long): String {
        if (lastUpdated <= 0L) return "Never synced"
        val diffMs = System.currentTimeMillis() - lastUpdated
        if (diffMs < 0) return "Updated just now"
        val mins = diffMs / (60 * 1000L)
        if (mins < 1) return "Updated just now"
        if (mins < 60) return "Updated ${mins}m ago"
        val hours = mins / 60
        if (hours < 24) return "Updated ${hours}h ago"
        val days = hours / 24
        return "Updated ${days}d ago"
    }

    fun createDeepLinkIntent(context: Context, url: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(url)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
