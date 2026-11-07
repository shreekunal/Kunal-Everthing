package com.kunal.os

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {

    @PluginMethod
    fun updateSnapshot(call: PluginCall) {
        val json = call.getString("json")
        if (json.isNullOrBlank()) {
            call.reject("Must provide non-empty json snapshot string")
            return
        }

        try {
            WidgetStorage.saveSnapshot(context, json)
            WidgetSyncManager.updateAllWidgets(context)

            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update widget snapshot: ${e.message}")
        }
    }

    @PluginMethod
    fun saveToken(call: PluginCall) {
        val token = call.getString("token")
        if (token.isNullOrBlank()) {
            call.reject("Must provide non-empty token string")
            return
        }

        try {
            WidgetStorage.saveToken(context, token)
            WidgetSyncManager.schedulePeriodicSync(context, false)
            WidgetSyncManager.enqueueImmediateSync(context)

            val ret = JSObject().apply {
                put("success", true)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to secure widget token: ${e.message}")
        }
    }

    @PluginMethod
    fun clearToken(call: PluginCall) {
        try {
            WidgetStorage.clearToken(context)
            WidgetStorage.clearSnapshot(context)
            WidgetSyncManager.cancelPeriodicSync(context)
            WidgetSyncManager.updateAllWidgets(context)

            val ret = JSObject().apply {
                put("success", true)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to clear widget token: ${e.message}")
        }
    }

    @PluginMethod
    fun getTokenStatus(call: PluginCall) {
        try {
            val hasToken = WidgetStorage.hasToken(context)
            val ret = JSObject().apply {
                put("hasToken", hasToken)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get token status: ${e.message}")
        }
    }
}
