#if SWIFT_PACKAGE
@_exported import NativeUICore
#endif
import WebViewNativeUIEngine
import Capacitor
import UIKit
import SwiftUI
import WebKit

@objc(NativeUIPlugin)
public class NativeUIPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "NativeUIPlugin"
    public let jsName = "NativeUI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "completeExtensionAction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "coveredSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWebViewMetrics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getVerticalBarsGeometry", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setToolbarTransitionProgress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareOverlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentOverlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getConnectionState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dismissOverlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "closeOverlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopOverlays", returnType: CAPPluginReturnPromise)
    ]
    private lazy var renderer = NativeUIController(environment: NativeUIEnvironment(
        webView: { [weak self] in self?.bridge?.webView },
        viewController: { [weak self] in self?.bridge?.viewController },
        emit: { [weak self] name, data in self?.notifyListeners(name, data: data) },
        hasListeners: { [weak self] name in self?.hasListeners(name) ?? false },
        trigger: { [weak self] name, data in self?.bridge?.triggerWindowJSEvent(eventName: name, data: data ?? "{}") }
    ))
    public override func load() { renderer.load() }
    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) { renderer.tabBar(tabBar, didSelect: item) }
    private func request(_ call: CAPPluginCall) -> NativeUICall {
        NativeUICall(options: call.options as? [String: Any] ?? [:],
                     resolve: { call.resolve($0) }, reject: { call.reject($0) })
    }
    @objc func prepareOverlay(_ call: CAPPluginCall) { renderer.prepareOverlay(request(call)) }
    @objc func presentOverlay(_ call: CAPPluginCall) { renderer.presentOverlay(request(call)) }
    @objc func getConnectionState(_ call: CAPPluginCall) { renderer.getConnectionState(request(call)) }
    @objc func dismissOverlay(_ call: CAPPluginCall) { renderer.dismissOverlay(request(call)) }
    @objc func closeOverlay(_ call: CAPPluginCall) { renderer.closeOverlay(request(call)) }
    @objc func stopOverlays(_ call: CAPPluginCall) { renderer.stopOverlays(request(call)) }
    @objc func getWebViewMetrics(_ call: CAPPluginCall) { renderer.getWebViewMetrics(request(call)) }
    @objc func configure(_ call: CAPPluginCall) { renderer.configure(request(call)) }
    @objc func coveredSnapshot(_ call: CAPPluginCall) { renderer.coveredSnapshot(request(call)) }
    @objc func getVerticalBarsGeometry(_ call: CAPPluginCall) { renderer.getVerticalBarsGeometry(request(call)) }
    @objc func completeExtensionAction(_ call: CAPPluginCall) { renderer.completeExtensionAction(request(call)) }
    @objc func clear(_ call: CAPPluginCall) { renderer.clear(request(call)) }
    @objc func setToolbarTransitionProgress(_ call: CAPPluginCall) { renderer.setToolbarTransitionProgress(request(call)) }
    @objc func update(_ call: CAPPluginCall) { renderer.update(request(call)) }
}
