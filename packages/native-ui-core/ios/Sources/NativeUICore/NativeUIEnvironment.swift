import Foundation
import WebKit
import UIKit

/** Host services only; rendering does not depend on a plugin SDK. */
public struct NativeUIEnvironment {
    public let webView: () -> WKWebView?
    public let viewController: () -> UIViewController?
    public let emit: (String, [String: Any]) -> Void
    public let hasListeners: (String) -> Bool
    private let trigger: (String, String?) -> Void
    public init(webView: @escaping () -> WKWebView?, viewController: @escaping () -> UIViewController?,
                emit: @escaping (String, [String: Any]) -> Void, hasListeners: @escaping (String) -> Bool,
                trigger: @escaping (String, String?) -> Void) {
        self.webView = webView; self.viewController = viewController
        self.emit = emit; self.hasListeners = hasListeners; self.trigger = trigger
    }
    public func triggerWindowJSEvent(eventName: String, data: String? = nil) { trigger(eventName, data) }
}

/** JSON request and completion callbacks, adapted at the framework boundary. */
public final class NativeUICall {
    public let options: [String: Any]
    private let success: ([String: Any]) -> Void
    private let failure: (String) -> Void
    public init(options: [String: Any], resolve: @escaping ([String: Any]) -> Void, reject: @escaping (String) -> Void) {
        self.options = options; success = resolve; failure = reject
    }
    public func getString(_ key: String) -> String? { options[key] as? String }
    public func getBool(_ key: String) -> Bool? { options[key] as? Bool }
    public func getInt(_ key: String) -> Int? { options[key] as? Int }
    public func getDouble(_ key: String) -> Double? { options[key] as? Double }
    public func getObject(_ key: String) -> [String: Any]? { options[key] as? [String: Any] }
    public func getArray<T>(_ key: String, _ type: T.Type) -> [T]? { options[key] as? [T] }
    public func decode<T: Decodable>(_ type: T.Type) throws -> T {
        try JSONDecoder().decode(type, from: JSONSerialization.data(withJSONObject: options))
    }
    public func resolve(_ value: [String: Any] = [:]) { success(value) }
    public func reject(_ message: String) { failure(message) }
}
