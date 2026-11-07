package com.kunal.os

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object WidgetSyncManager {
    const val UNIQUE_PERIODIC_WORK_TAG = "kunal_os_widget_periodic_sync"
    const val UNIQUE_IMMEDIATE_WORK_TAG = "kunal_os_widget_immediate_sync"
    private const val KEY_SCHEDULED_INTERVAL = "scheduled_interval_minutes"

    fun updateAllWidgets(ctx: Context) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(ctx)

            // 1. Today Widget
            val todayComponent = ComponentName(ctx, TodayWidgetProvider::class.java)
            val todayIds = appWidgetManager.getAppWidgetIds(todayComponent)
            for (id in todayIds) {
                TodayWidgetProvider.updateAppWidget(ctx, appWidgetManager, id)
            }
            if (todayIds.isNotEmpty()) {
                val intent = Intent(ctx, TodayWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, todayIds)
                }
                ctx.sendBroadcast(intent)
            }

            // 2. Water & Steps Widget
            val healthComponent = ComponentName(ctx, WaterStepsWidgetProvider::class.java)
            val healthIds = appWidgetManager.getAppWidgetIds(healthComponent)
            for (id in healthIds) {
                WaterStepsWidgetProvider.updateAppWidget(ctx, appWidgetManager, id)
            }
            if (healthIds.isNotEmpty()) {
                val intent = Intent(ctx, WaterStepsWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, healthIds)
                }
                ctx.sendBroadcast(intent)
            }

            // 3. Together Widget
            val togetherComponent = ComponentName(ctx, TogetherWidgetProvider::class.java)
            val togetherIds = appWidgetManager.getAppWidgetIds(togetherComponent)
            for (id in togetherIds) {
                TogetherWidgetProvider.updateAppWidget(ctx, appWidgetManager, id)
            }
            if (togetherIds.isNotEmpty()) {
                val intent = Intent(ctx, TogetherWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, togetherIds)
                }
                ctx.sendBroadcast(intent)
            }

            // 4. Quick Actions Widget
            val quickActionsComponent = ComponentName(ctx, QuickActionsWidgetProvider::class.java)
            val quickActionsIds = appWidgetManager.getAppWidgetIds(quickActionsComponent)
            for (id in quickActionsIds) {
                QuickActionsWidgetProvider.updateAppWidget(ctx, appWidgetManager, id)
            }
            if (quickActionsIds.isNotEmpty()) {
                val intent = Intent(ctx, QuickActionsWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, quickActionsIds)
                }
                ctx.sendBroadcast(intent)
            }
        } catch (e: Exception) {
            // Non-fatal safety guard
        }
    }

    /**
     * Schedules periodic background sync via WorkManager.
     * Only updates work if the desired interval (15m vs 30m) has changed.
     */
    fun schedulePeriodicSync(context: Context, isPartnerFocusing: Boolean = false, force: Boolean = false) {
        if (!WidgetStorage.hasToken(context)) {
            cancelPeriodicSync(context)
            return
        }

        val targetInterval = if (isPartnerFocusing) 15L else 30L
        val prefs = WidgetStorage.getPrefs(context)
        val currentScheduled = prefs.getLong(KEY_SCHEDULED_INTERVAL, -1L)

        if (!force && currentScheduled == targetInterval) {
            // Already scheduled with the exact interval; avoid wasteful rescheduling
            return
        }

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val periodicWork = PeriodicWorkRequestBuilder<WidgetSyncWorker>(
            targetInterval,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_PERIODIC_WORK_TAG,
            ExistingPeriodicWorkPolicy.UPDATE,
            periodicWork
        )

        prefs.edit().putLong(KEY_SCHEDULED_INTERVAL, targetInterval).apply()
    }

    @JvmStatic
    fun enqueueImmediateSync(context: Context) {
        if (!WidgetStorage.hasToken(context)) return

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val oneTimeWork = OneTimeWorkRequestBuilder<WidgetSyncWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            UNIQUE_IMMEDIATE_WORK_TAG,
            ExistingWorkPolicy.REPLACE,
            oneTimeWork
        )
    }

    fun cancelPeriodicSync(context: Context) {
        try {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_PERIODIC_WORK_TAG)
            WidgetStorage.getPrefs(context).edit().remove(KEY_SCHEDULED_INTERVAL).apply()
        } catch (ignored: Exception) {
        }
    }
}
