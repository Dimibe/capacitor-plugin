import UIKit
import WebKit
import XCTest
@testable import NativeUICore

final class NativeUIPressGroupFocusTests: XCTestCase {
    @MainActor
    func testFocusedActionSurvivesSiblingInsertionAndRemoval() async throws {
        guard #available(iOS 26.0, *) else { throw XCTSkip("Requires native glass controls") }
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else {
            throw XCTSkip("Requires the application-hosted test scheme")
        }
        let originalWindow = scene.keyWindow
        let window = UIWindow(windowScene: scene)
        let owner = UIViewController()
        window.rootViewController = owner
        window.makeKeyAndVisible()
        defer {
            window.isHidden = true
            originalWindow?.makeKey()
        }
        let webView = WKWebView(frame: owner.view.bounds)
        webView.accessibilityElementsHidden = true
        owner.view.addSubview(webView)
        let controller = NativeUIController(environment: NativeUIEnvironment(webView: { webView }, viewController: { owner },
            emit: { _, _ in }, hasListeners: { _ in false }, trigger: { _, _ in }))
        @MainActor func update(_ ids: [String], revision: Int) async throws {
            let items: [[String: Any]] = ids.enumerated().map { index, id in
                ["id": id, "x": index * 56, "y": 0, "width": 44, "height": 44,
                 "label": id, "accessibilityLabel": id, "disabled": false, "selected": false,
                 "fontSize": 17, "fontWeight": 400, "color": "rgb(0, 0, 0)"]
            }
            let control: [String: Any] = ["id": "tools", "kind": "ion-buttons", "pressBlending": true, "items": items,
                "x": 16, "y": 100, "width": 168, "height": 44, "dark": false, "rtl": false]
            try await withCheckedThrowingContinuation { (result: CheckedContinuation<Void, Error>) in
                controller.update(NativeUICall(options: ["revision": revision, "viewportWidth": Double(webView.bounds.width), "controls": [control]],
                    resolve: { _ in result.resume() }, reject: { reason in result.resume(throwing: NSError(domain: "FocusTests", code: 1,
                        userInfo: [NSLocalizedDescriptionKey: reason])) }))
            }
            owner.view.layoutIfNeeded()
        }
        try await update(["More", "Share"], revision: 1)
        let host = try XCTUnwrap(owner.view.subviews.compactMap { $0 as? NativeUIHost }.first)
        let group = try XCTUnwrap(host.subviews.compactMap { $0 as? NativeUIPressGroup }.first)
        let button = try XCTUnwrap((group.accessibilityElements as? [UIButton])?.first { $0.accessibilityIdentifier == "Share" })
        let testVoiceOverFocus = UIAccessibility.isVoiceOverRunning
        @MainActor func voiceOverIsOnShare() -> Bool {
            (UIAccessibility.focusedElement(using: .notificationVoiceOver) as? UIButton) === button || button.accessibilityElementIsFocused()
        }
        if testVoiceOverFocus {
            UIAccessibility.post(notification: .screenChanged, argument: button)
            for _ in 0..<50 {
                if voiceOverIsOnShare() { break }
                try await Task.sleep(nanoseconds: 100_000_000)
            }
            XCTAssertTrue(voiceOverIsOnShare())
        }
        for (index, actions) in [["Edit", "More", "Share"], ["More", "Share"]].enumerated() {
            try await update(actions, revision: index + 2)
            XCTAssertTrue(button.window === window)
            XCTAssertTrue(group === host.subviews.first)
            let actionsInReadingOrder = try XCTUnwrap(group.accessibilityElements as? [UIButton])
            XCTAssertEqual(actionsInReadingOrder.compactMap(\.accessibilityIdentifier), actions)
            XCTAssertTrue(actionsInReadingOrder.contains { $0 === button })
            if testVoiceOverFocus {
                try await Task.sleep(nanoseconds: 500_000_000)
                XCTAssertTrue(voiceOverIsOnShare())
            }
        }
    }
}
