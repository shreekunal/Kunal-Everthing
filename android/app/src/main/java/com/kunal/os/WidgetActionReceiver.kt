package com.kunal.os

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class WidgetActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_LOG_WATER = "com.kunal.os.ACTION_WIDGET_LOG_WATER"
        const val ACTION_COMPLETE_TASK = "com.kunal.os.ACTION_WIDGET_COMPLETE_TASK"
        const val EXTRA_TASK_ID = "extra_task_id"
        const val EXTRA_REQUEST_ID = "extra_request_id"
        private const val ACTION_URL = "https://kunal-os.onrender.com/api/widget/action"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != ACTION_LOG_WATER && action != ACTION_COMPLETE_TASK) return

        val originalSnapshot = WidgetStorage.getSnapshot(context) ?: return
        val originalJsonString = originalSnapshot.toString()

        val token = WidgetStorage.getToken(context)
        if (token.isNullOrBlank()) {
            return
        }

        val pendingResult = goAsync()

        if (action == ACTION_LOG_WATER) {
            val requestId = intent.getStringExtra(EXTRA_REQUEST_ID) ?: UUID.randomUUID().toString()

            // 1. Optimistic update
            try {
                val currentMl = originalSnapshot.optInt("waterMl", 0)
                originalSnapshot.put("waterMl", currentMl + 250)
                WidgetStorage.saveSnapshot(context, originalSnapshot.toString())
                WidgetSyncManager.updateAllWidgets(context)
            } catch (ignored: Exception) {
            }

            // 2. Network dispatch via goAsync Coroutine
            CoroutineScope(Dispatchers.IO).launch {
                val payload = JSONObject().apply {
                    put("action", "LOG_WATER")
                    put("requestId", requestId)
                }
                val success = sendActionRequest(token, payload)
                if (!success) {
                    // Revert optimistic update
                    WidgetStorage.saveSnapshot(context, originalJsonString)
                    WidgetSyncManager.updateAllWidgets(context)
                } else {
                    // Refresh snapshot in background to ensure accurate totals
                    WidgetSyncManager.enqueueImmediateSync(context)
                }
                pendingResult.finish()
            }
        } else if (action == ACTION_COMPLETE_TASK) {
            val taskId = intent.getStringExtra(EXTRA_TASK_ID)
            if (taskId.isNullOrBlank()) {
                pendingResult.finish()
                return
            }

            // 1. Optimistic update: filter out the completed task from tasks list
            try {
                val tasks = originalSnapshot.optJSONArray("tasksDueToday") ?: originalSnapshot.optJSONArray("tasks")
                if (tasks != null) {
                    val updatedArray = JSONArray()
                    for (i in 0 until tasks.length()) {
                        val taskObj = tasks.optJSONObject(i)
                        val id = taskObj?.optString("id")
                        if (id != taskId) {
                            updatedArray.put(taskObj)
                        }
                    }
                    originalSnapshot.put("tasksDueToday", updatedArray)
                    originalSnapshot.put("tasks", updatedArray)
                    WidgetStorage.saveSnapshot(context, originalSnapshot.toString())
                    WidgetSyncManager.updateAllWidgets(context)
                }
            } catch (ignored: Exception) {
            }

            // 2. Network dispatch
            CoroutineScope(Dispatchers.IO).launch {
                val payload = JSONObject().apply {
                    put("action", "COMPLETE_TASK")
                    put("taskId", taskId)
                }
                val success = sendActionRequest(token, payload)
                if (!success) {
                    // Revert optimistic update
                    WidgetStorage.saveSnapshot(context, originalJsonString)
                    WidgetSyncManager.updateAllWidgets(context)
                } else {
                    WidgetSyncManager.enqueueImmediateSync(context)
                }
                pendingResult.finish()
            }
        }
    }

    private fun sendActionRequest(token: String, payload: JSONObject): Boolean {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(ACTION_URL)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("User-Agent", "KunalOS-Widget-Action/1.0")
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            conn.responseCode in 200..299
        } catch (e: Exception) {
            false
        } finally {
            try {
                conn?.disconnect()
            } catch (ignored: Exception) {
            }
        }
    }
}
