package com.kunal.os

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class TodayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_today)
            val snapshot = WidgetStorage.getSnapshot(context)
            val lastUpdated = WidgetStorage.getLastUpdatedTime(context)

            // Deep link on root to /tasks
            val openTasksIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/tasks",
                101
            )
            views.setOnClickPendingIntent(R.id.today_widget_root, openTasksIntent)

            if (snapshot == null) {
                views.setViewVisibility(R.id.today_widget_empty, View.VISIBLE)
                views.setViewVisibility(R.id.today_widget_content, View.GONE)
                views.setViewVisibility(R.id.today_stale_overlay, View.GONE)
            } else {
                views.setViewVisibility(R.id.today_widget_empty, View.GONE)
                views.setViewVisibility(R.id.today_widget_content, View.VISIBLE)

                // Stale detection (>6 hours)
                val isStale = WidgetStorage.isStale(lastUpdated)
                views.setViewVisibility(
                    R.id.today_stale_overlay,
                    if (isStale) View.VISIBLE else View.GONE
                )

                val relTime = WidgetStorage.formatRelativeTime(lastUpdated)
                views.setTextViewText(
                    R.id.today_updated_time,
                    if (isStale) "$relTime • Stale" else relTime
                )
                views.setTextColor(
                    R.id.today_updated_time,
                    if (isStale) Color.parseColor("#F59E0B") else Color.parseColor("#A1A1AA")
                )

                // Streak & Pet badge
                val streak = snapshot.optInt("disciplineStreak", 0)
                val stage = snapshot.optString("petStage", "Wolf")
                views.setTextViewText(R.id.today_streak_badge, "🔥 ${streak}d • $stage")

                // Tasks list (top 4)
                val tasks = snapshot.optJSONArray("tasksDueToday") ?: snapshot.optJSONArray("tasks")
                val tasksCount = tasks?.length() ?: 0

                if (tasksCount == 0) {
                    views.setViewVisibility(R.id.today_tasks_empty_text, View.VISIBLE)
                    views.setViewVisibility(R.id.task_row_1, View.GONE)
                    views.setViewVisibility(R.id.task_row_2, View.GONE)
                    views.setViewVisibility(R.id.task_row_3, View.GONE)
                    views.setViewVisibility(R.id.task_row_4, View.GONE)
                } else {
                    views.setViewVisibility(R.id.today_tasks_empty_text, View.GONE)

                    val rowIds = intArrayOf(R.id.task_row_1, R.id.task_row_2, R.id.task_row_3, R.id.task_row_4)
                    val titleIds = intArrayOf(R.id.task_title_1, R.id.task_title_2, R.id.task_title_3, R.id.task_title_4)
                    val priorityIds = intArrayOf(R.id.task_priority_1, R.id.task_priority_2, R.id.task_priority_3, R.id.task_priority_4)

                    for (i in 0 until 4) {
                        if (i < tasksCount) {
                            val taskObj = tasks!!.optJSONObject(i)
                            val title = taskObj?.optString("title", "Task") ?: "Task"
                            val priority = taskObj?.optString("priority", "MED") ?: "MED"
                            val taskId = taskObj?.optString("id")

                            views.setViewVisibility(rowIds[i], View.VISIBLE)
                            views.setTextViewText(titleIds[i], title)
                            views.setTextViewText(priorityIds[i], priority.take(4).uppercase())
                            views.setTextColor(
                                priorityIds[i],
                                if (priority.equals("HIGH", ignoreCase = true)) {
                                    Color.parseColor("#EF4444")
                                } else {
                                    Color.parseColor("#A1A1AA")
                                }
                            )

                            // 1-Tap Complete Task PendingIntent
                            if (!taskId.isNullOrBlank()) {
                                val completeIntent = Intent(context, WidgetActionReceiver::class.java).apply {
                                    action = WidgetActionReceiver.ACTION_COMPLETE_TASK
                                    putExtra(WidgetActionReceiver.EXTRA_TASK_ID, taskId)
                                }
                                val completePending = PendingIntent.getBroadcast(
                                    context,
                                    1200 + i,
                                    completeIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                )
                                views.setOnClickPendingIntent(rowIds[i], completePending)
                            }
                        } else {
                            views.setViewVisibility(rowIds[i], View.GONE)
                        }
                    }
                }

                // Routines Left count
                val routinesLeft = snapshot.optInt("routinesLeftCount", snapshot.optInt("routinesLeft", 0))
                views.setTextViewText(R.id.today_routines_text, "Routines: $routinesLeft left")

                // Next Important Date
                val nextDateObj = snapshot.optJSONObject("nextDate")
                if (nextDateObj != null) {
                    val dateName = nextDateObj.optString("name", "Event")
                    val daysLeft = nextDateObj.optInt("daysLeft", 0)
                    views.setTextViewText(R.id.today_next_date_text, "🗓️ $dateName (${daysLeft}d)")
                } else {
                    views.setTextViewText(R.id.today_next_date_text, "No upcoming dates")
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
