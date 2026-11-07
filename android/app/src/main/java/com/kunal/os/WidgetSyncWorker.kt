package com.kunal.os

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class WidgetSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val SNAPSHOT_URL = "https://kunal-os.onrender.com/api/widget/snapshot"
        private const val CONNECT_TIMEOUT_MS = 60_000 // 60s cold-start tolerant
        private const val READ_TIMEOUT_MS = 60_000
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val token = WidgetStorage.getToken(applicationContext)
        if (token.isNullOrBlank()) {
            // No token configured: stop work
            WidgetSyncManager.cancelPeriodicSync(applicationContext)
            return@withContext Result.success()
        }

        var connection: HttpURLConnection? = null
        try {
            val url = URL(SNAPSHOT_URL)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "KunalOS-Widget-Worker/2.0")
                instanceFollowRedirects = true
            }

            val statusCode = connection.responseCode

            if (statusCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val responseStr = reader.use { it.readText() }

                if (responseStr.isNotBlank()) {
                    WidgetStorage.saveSnapshot(applicationContext, responseStr)

                    // Check if partner is actively focusing now
                    var isPartnerFocusing = false
                    try {
                        val json = JSONObject(responseStr)
                        val partnerObj = json.optJSONObject("partner")
                        isPartnerFocusing = partnerObj?.optBoolean("focusingNow", false) ?: false
                    } catch (ignored: Exception) {
                    }

                    WidgetSyncManager.updateAllWidgets(applicationContext)
                    WidgetSyncManager.schedulePeriodicSync(applicationContext, isPartnerFocusing)
                }
                return@withContext Result.success()
            } else if (statusCode == 401 || statusCode == 403) {
                // Token revoked or unauthorized: clear credentials & fallback to sync prompt
                WidgetStorage.clearToken(applicationContext)
                WidgetStorage.clearSnapshot(applicationContext)
                WidgetSyncManager.updateAllWidgets(applicationContext)
                WidgetSyncManager.cancelPeriodicSync(applicationContext)
                return@withContext Result.success()
            } else {
                // Server 5xx or cold start 502/504
                if (runAttemptCount < 3) {
                    return@withContext Result.retry()
                } else {
                    return@withContext Result.failure()
                }
            }
        } catch (e: Exception) {
            // Network disconnection, Render boot timeout, or DNS resolution glitch
            if (runAttemptCount < 3) {
                return@withContext Result.retry()
            } else {
                return@withContext Result.failure()
            }
        } finally {
            try {
                connection?.disconnect()
            } catch (ignored: Exception) {
            }
        }
    }
}
