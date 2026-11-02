import XCTest
import NativeUIPlugin

// Deliberately do not import NativeUICore: existing apps use this module alone.
final class NativeUIPublicImportTests: XCTestCase {
    func testRenderingAPIIsReexported() {
        let image = NativeUIImage(data: "", width: 0, height: 1)
        XCTAssertNil(NativeUIRendering.image(image))
    }
}
