package dev.rdlabo.capacitor.nativeui

import org.json.JSONObject

/** Framework-independent JSON request. The host owns promise/callback transport. */
class NativeUICall(
    val data: JSONObject,
    private val success: (JSONObject) -> Unit,
    private val failure: (String, Exception?) -> Unit,
) {
    fun getString(key: String): String? = data.opt(key) as? String
    fun getBoolean(key: String, fallback: Boolean): Boolean = data.opt(key) as? Boolean ?: fallback
    fun resolve(value: JSONObject = JSONObject()) = success(value)
    fun reject(message: String, error: Exception? = null) = failure(message, error)
}
