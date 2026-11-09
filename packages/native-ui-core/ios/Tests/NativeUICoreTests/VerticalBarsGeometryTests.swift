import XCTest
import UIKit
@testable import NativeUICore

final class VerticalBarsGeometryTests: XCTestCase {
    @MainActor func testMaskedRendererResolvesGroupAndItemFramesWhenAXHasNoIdentifiers() throws {
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 400, height: 800))
        window.rootViewController = UIViewController()
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        let web = try XCTUnwrap(window.rootViewController?.view)
        let rail = UIView(frame: web.bounds)
        web.addSubview(rail)
        rail.layer.mask = CALayer()
        rail.accessibilityElementsHidden = true
        for y in [80, 140] { rail.addSubview(UIButton(frame: CGRect(x: 20, y: y, width: 48, height: 48))) }
        let items: [[String: Any]] = ["close", "extra"].map { id in
            ["id": id, "x": 0, "y": 0, "width": 48, "height": 48, "label": id, "accessibilityLabel": id,
             "disabled": false, "selected": false, "fontSize": 17, "fontWeight": 400, "color": "#000000"]
        }
        let call = NativeUICall(options: ["id": "actions", "kind": "button-group", "placement": "vertical-bars", "toolbarSlot": "start",
                                         "x": 0, "y": 0, "width": 96, "height": 44, "dark": false, "rtl": false, "items": items],
                                resolve: { _ in }, reject: { XCTFail($0) })
        let control = try call.decode(NativeUIControl.self)
        let geometry = NativeUIVerticalBarsGeometry.resolve(in: rail, relativeTo: web, ids: ["actions", "close", "extra"], controls: [control])
        XCTAssertEqual(geometry["close"], CGRect(x: 20, y: 80, width: 48, height: 48))
        XCTAssertEqual(geometry["extra"], CGRect(x: 20, y: 140, width: 48, height: 48))
        XCTAssertEqual(geometry["actions"], CGRect(x: 20, y: 80, width: 48, height: 108))
        let bottom = rail.frame.maxY
        XCTAssertTrue(NativeUIVerticalBarsGeometry.alignToolbar(.init(centerY: 365, minimumTop: 174), in: rail, relativeTo: web, controls: [control], scale: 1))
        let aligned = NativeUIVerticalBarsGeometry.resolve(in: rail, relativeTo: web, ids: ["close", "extra"], controls: [control])
        XCTAssertEqual(try XCTUnwrap(aligned["close"]).midY, 365)
        XCTAssertEqual(try XCTUnwrap(aligned["extra"]).midY, 425)
        XCTAssertEqual(rail.frame.maxY, bottom)
        XCTAssertTrue(NativeUIVerticalBarsGeometry.alignToolbar(.init(centerY: 100, minimumTop: 174), in: rail, relativeTo: web, controls: [control], scale: 1))
        XCTAssertEqual(try XCTUnwrap(NativeUIVerticalBarsGeometry.resolve(in: rail, relativeTo: web, ids: ["close"], controls: [control])["close"]).minY, 174)
        rail.removeFromSuperview()
        XCTAssertTrue(NativeUIVerticalBarsGeometry.resolve(in: rail, relativeTo: web, ids: ["actions"], controls: [control]).isEmpty)
        web.addSubview(rail)
        rail.addSubview(UIButton(frame: CGRect(x: 20, y: 200, width: 48, height: 48)))
        XCTAssertTrue(NativeUIVerticalBarsGeometry.resolve(in: rail, relativeTo: web, ids: ["actions"], controls: [control]).isEmpty,
                      "A count mismatch must not guess which native controls belong to the source")
        let unchanged = rail.frame
        XCTAssertFalse(NativeUIVerticalBarsGeometry.alignToolbar(.init(centerY: 365, minimumTop: 174), in: rail, relativeTo: web, controls: [control], scale: 1))
        XCTAssertEqual(rail.frame, unchanged)
    }
}
