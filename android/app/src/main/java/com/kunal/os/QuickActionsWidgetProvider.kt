package com.kunal.os

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class QuickActionsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_actions)

            // 1. New Task
            val taskIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/?action=quickadd&tab=task",
                201
            )
            views.setOnClickPendingIntent(R.id.action_new_task, taskIntent)

            // 2. Diary
            val diaryIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/diary",
                202
            )
            views.setOnClickPendingIntent(R.id.action_diary, diaryIntent)

            // 3. Message Love
            val messageIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/?action=quickadd&tab=message",
                203
            )
            views.setOnClickPendingIntent(R.id.action_message, messageIntent)

            // 4. Rewards
            val rewardsIntent = WidgetStorage.createDeepLinkIntent(
                context,
                "https://kunal-os.onrender.com/rewards",
                204
            )
            views.setOnClickPendingIntent(R.id.action_rewards, rewardsIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
