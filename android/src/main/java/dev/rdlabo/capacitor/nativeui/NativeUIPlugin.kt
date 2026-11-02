package dev.rdlabo.capacitor.nativeui

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativeUI")
class NativeUIPlugin : Plugin() {
    private val renderer by lazy { NativeUIController(activity, bridge.webView) { name, data ->
        notifyListeners(name, JSObject(data.toString()))
    } }
    override fun load() = renderer.load()
    private fun request(call: PluginCall) = NativeUICall(call.data,
        { call.resolve(JSObject(it.toString())) }, { message, error -> call.reject(message, error) })
    @PluginMethod
    fun configure(call: PluginCall) = renderer.configure(request(call))
    @PluginMethod
    fun getWebViewMetrics(call: PluginCall) = renderer.getWebViewMetrics(request(call))
    @PluginMethod
    fun update(call: PluginCall) = renderer.update(request(call))
    @PluginMethod
    fun coveredSnapshot(call: PluginCall) = renderer.coveredSnapshot(request(call))
    @PluginMethod
    fun completeExtensionAction(call: PluginCall) = renderer.completeExtensionAction(request(call))
    @PluginMethod
    fun clear(call: PluginCall) = renderer.clear(request(call))
    override fun handleOnPause() { renderer.pause(); super.handleOnPause() }
    override fun handleOnResume() { renderer.resume(); super.handleOnResume() }
    override fun handleOnDestroy() { renderer.destroy(); super.handleOnDestroy() }
}
