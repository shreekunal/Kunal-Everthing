package com.kunal.os

import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private fun isAvailableInternal(): Boolean {
        return try {
            val status = HealthConnectClient.getSdkStatus(context)
            status == HealthConnectClient.SDK_AVAILABLE
        } catch (e: Exception) {
            false
        }
    }

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        try {
            val status = HealthConnectClient.getSdkStatus(context)
            val ret = JSObject()
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> {
                    ret.put("available", true)
                    ret.put("status", "AVAILABLE")
                }
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                    ret.put("available", false)
                    ret.put("status", "UPDATE_REQUIRED")
                }
                else -> {
                    ret.put("available", false)
                    ret.put("status", "UNAVAILABLE")
                }
            }
            call.resolve(ret)
        } catch (e: Exception) {
            val ret = JSObject()
            ret.put("available", false)
            ret.put("status", "UNAVAILABLE")
            ret.put("error", e.message)
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun checkHealthPermissions(call: PluginCall) {
        if (!isAvailableInternal()) {
            val ret = JSObject()
            ret.put("granted", false)
            ret.put("available", false)
            call.resolve(ret)
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                val stepPerm = HealthPermission.getReadPermission(StepsRecord::class)
                val hasPermission = granted.contains(stepPerm)

                val ret = JSObject()
                ret.put("granted", hasPermission)
                ret.put("available", true)
                call.resolve(ret)
            } catch (e: Exception) {
                val ret = JSObject()
                ret.put("granted", false)
                ret.put("available", true)
                ret.put("error", e.message)
                call.resolve(ret)
            }
        }
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        if (!isAvailableInternal()) {
            call.reject("Health Connect is not available on this device.")
            return
        }

        try {
            val stepPerm = HealthPermission.getReadPermission(StepsRecord::class)
            val contract = PermissionController.createRequestPermissionResultContract()
            val intent = contract.createIntent(context, setOf(stepPerm))
            startActivityForResult(call, intent, "permissionsCallback")
        } catch (e: Exception) {
            call.reject("Failed to request permissions: ${e.message}")
        }
    }

    @ActivityCallback
    private fun permissionsCallback(call: PluginCall, result: ActivityResult) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                val stepPerm = HealthPermission.getReadPermission(StepsRecord::class)
                val hasPermission = granted.contains(stepPerm)

                val ret = JSObject()
                ret.put("granted", hasPermission)
                call.resolve(ret)
            } catch (e: Exception) {
                val ret = JSObject()
                ret.put("granted", false)
                ret.put("error", e.message)
                call.resolve(ret)
            }
        }
    }

    @PluginMethod
    fun getTodaySteps(call: PluginCall) {
        if (!isAvailableInternal()) {
            val ret = JSObject()
            ret.put("success", false)
            ret.put("status", "UNAVAILABLE")
            ret.put("steps", 0)
            call.resolve(ret)
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                val stepPerm = HealthPermission.getReadPermission(StepsRecord::class)

                if (!granted.contains(stepPerm)) {
                    val ret = JSObject()
                    ret.put("success", false)
                    ret.put("status", "PERMISSION_REQUIRED")
                    ret.put("steps", 0)
                    call.resolve(ret)
                    return@launch
                }

                val zone = ZoneId.systemDefault()
                val startOfDay = LocalDate.now(zone).atStartOfDay(zone).toInstant()
                val now = Instant.now()

                val response = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(startOfDay, now)
                    )
                )

                val stepCount = response[StepsRecord.COUNT_TOTAL] ?: 0L

                val ret = JSObject()
                ret.put("success", true)
                ret.put("status", "OK")
                ret.put("steps", stepCount)
                call.resolve(ret)
            } catch (e: Exception) {
                val ret = JSObject()
                ret.put("success", false)
                ret.put("status", "ERROR")
                ret.put("error", e.message ?: "Failed to read steps")
                ret.put("steps", 0)
                call.resolve(ret)
            }
        }
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                val ret = JSObject()
                ret.put("success", true)
                call.resolve(ret)
            } catch (e2: Exception) {
                call.reject("Could not open Health Connect settings: ${e.message}")
            }
        }
    }
}
