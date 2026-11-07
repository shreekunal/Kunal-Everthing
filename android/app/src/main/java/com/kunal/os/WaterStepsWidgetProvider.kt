package com.kunal.os

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID

class WaterStepsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_water_steps)
            val snapshot = WidgetStorage.getSnapshot(context)
            val lastUpdated = WidgetStorage.getLastUpdatedTime(context)

            // Deep link on root to /health
            val openHealthIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/health",
                102
            )
            views.setOnClickPendingIntent(R.id.health_widget_root, openHealthIntent)

            // 1-Tap Log Water (+250 ml) Action PendingIntent
            val logWaterIntent = Intent(context, WidgetActionReceiver::class.java).apply {
                action = WidgetActionReceiver.ACTION_LOG_WATER
                putExtra(WidgetActionReceiver.EXTRA_REQUEST_ID, UUID.randomUUID().toString())
            }
            val logWaterPending = PendingIntent.getBroadcast(
                context,
                1101,
                logWaterIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_water_add, logWaterPending)

            if (snapshot == null) {
                views.setViewVisibility(R.id.health_widget_empty, View.VISIBLE)
                views.setViewVisibility(R.id.health_widget_content, View.GONE)
                views.setViewVisibility(R.id.health_stale_overlay, View.GONE)
            } else {
                views.setViewVisibility(R.id.health_widget_empty, View.GONE)
                views.setViewVisibility(R.id.health_widget_content, View.VISIBLE)

                // Stale detection (>6 hours)
                val isStale = WidgetStorage.isStale(lastUpdated)
                views.setViewVisibility(
                    R.id.health_stale_overlay,
                    if (isStale) View.VISIBLE else View.GONE
                )

                val relTime = WidgetStorage.formatRelativeTime(lastUpdated)
                views.setTextViewText(
                    R.id.health_updated_time,
                    if (isStale) "$relTime • Stale" else relTime
                )
                views.setTextColor(
                    R.id.health_updated_time,
                    if (isStale) Color.parseColor("#F59E0B") else Color.parseColor("#A1A1AA")
                )

                val numFmt = NumberFormat.getNumberInstance(Locale.US)

                // 1. Water
                val waterMl = snapshot.optInt("waterMl", 0)
                val waterGoal = snapshot.optInt("waterGoal", 2000).coerceAtLeast(1)
                val waterPct = ((waterMl.toLong() * 100) / waterGoal).toInt()

                views.setTextViewText(R.id.water_percent_text, "$waterPct%")
                views.setTextViewText(
                    R.id.water_amount_text,
                    "${numFmt.format(waterMl)} / ${numFmt.format(waterGoal)} ml"
                )
                views.setProgressBar(
                    R.id.water_progress_bar,
                    waterGoal,
                    waterMl.coerceAtMost(waterGoal),
                    false
                )

                // 2. Steps
                val steps = snapshot.optInt("steps", 0)
                val stepsGoal = snapshot.optInt("stepsGoal", 10000).coerceAtLeast(1)
                val stepsPct = ((steps.toLong() * 100) / stepsGoal).toInt()

                views.setTextViewText(R.id.steps_percent_text, "$stepsPct%")
                views.setTextViewText(
                    R.id.steps_amount_text,
                    "${numFmt.format(steps)} / ${numFmt.format(stepsGoal)}"
                )
                views.setProgressBar(
                    R.id.steps_progress_bar,
                    stepsGoal,
                    steps.coerceAtMost(stepsGoal),
                    false
                )
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
