package com.kunal.os

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class TogetherWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_together)
            val snapshot = WidgetStorage.getSnapshot(context)
            val lastUpdated = WidgetStorage.getLastUpdatedTime(context)

            // Deep link on root to /partner
            val openPartnerIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/partner",
                103
            )
            views.setOnClickPendingIntent(R.id.together_widget_root, openPartnerIntent)

            if (snapshot == null) {
                views.setViewVisibility(R.id.together_widget_empty, View.VISIBLE)
                views.setViewVisibility(R.id.together_widget_content, View.GONE)
                views.setViewVisibility(R.id.together_stale_overlay, View.GONE)
            } else {
                views.setViewVisibility(R.id.together_widget_empty, View.GONE)
                views.setViewVisibility(R.id.together_widget_content, View.VISIBLE)

                // Stale detection (>6 hours)
                val isStale = WidgetStorage.isStale(lastUpdated)
                views.setViewVisibility(
                    R.id.together_stale_overlay,
                    if (isStale) View.VISIBLE else View.GONE
                )

                val relTime = WidgetStorage.formatRelativeTime(lastUpdated)
                views.setTextViewText(
                    R.id.together_updated_time,
                    if (isStale) "$relTime • Stale" else relTime
                )
                views.setTextColor(
                    R.id.together_updated_time,
                    if (isStale) Color.parseColor("#F59E0B") else Color.parseColor("#A1A1AA")
                )

                // Days Together
                val daysTogether = snapshot.optInt("daysTogether", 0)
                views.setTextViewText(R.id.together_days_count, "❤️ $daysTogether Days Together")

                // Next Anniversary
                val anniObj = snapshot.optJSONObject("nextAnniversary")
                if (anniObj != null) {
                    val daysLeft = anniObj.optInt("daysLeft", 0)
                    val formatted = anniObj.optString("formattedDate", "")
                    val isToday = anniObj.optBoolean("isToday", false)
                    val text = if (isToday) {
                        "🎉 Today is our Anniversary!"
                    } else if (daysLeft == 1) {
                        "Anniversary Tomorrow! ($formatted)"
                    } else {
                        "Anniversary in $daysLeft days ($formatted)"
                    }
                    views.setTextViewText(R.id.together_anniversary_text, text)
                } else {
                    views.setTextViewText(R.id.together_anniversary_text, "Consistency is our promise")
                }

                // Partner Status
                val partnerObj = snapshot.optJSONObject("partner")
                val partnerName = partnerObj?.optString("name", "Partner") ?: "Partner"
                val isFocusing = partnerObj?.optBoolean("focusingNow", false) ?: false
                val focusProject = partnerObj?.optString("focusProject", "") ?: ""
                val pendingTasks = partnerObj?.optInt("pendingTasksCount", 0) ?: 0

                val statusText = if (isFocusing && focusProject.isNotBlank()) {
                    "🟢 $partnerName: $focusProject"
                } else if (isFocusing) {
                    "🟢 $partnerName: Focusing"
                } else {
                    "⚪ $partnerName: Resting"
                }

                views.setTextViewText(R.id.together_partner_status, statusText)
                views.setTextViewText(R.id.together_partner_tasks, "$pendingTasks pending")
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
