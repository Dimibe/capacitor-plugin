import XCTest
@testable import NativeUICore

final class HostBoundaryTests: XCTestCase {
    struct Payload: Decodable {
        let revision: Int
        let width: Double
        let enabled: Bool
        let label: String?
    }
    func testJSONPayloadPreservesNumbersBooleansAndNull() throws {
        var result: [String: Any]?
        let call = NativeUICall(options: ["revision": 2, "width": 12.5, "enabled": true, "label": NSNull()],
                                resolve: { result = $0 }, reject: { XCTFail($0) })
        let value = try call.decode(Payload.self)
        XCTAssertEqual(value.revision, 2)
        XCTAssertEqual(value.width, 12.5)
        XCTAssertTrue(value.enabled)
        XCTAssertNil(value.label)
        call.resolve(["revision": value.revision])
        XCTAssertEqual(result?["revision"] as? Int, 2)
    }
    func testMalformedPayloadAndFailureRemainHostVisible() {
        var error: String?
        let call = NativeUICall(options: ["revision": "wrong"], resolve: { _ in XCTFail("Unexpected success") }, reject: { error = $0 })
        XCTAssertThrowsError(try call.decode(Payload.self))
        call.reject("Invalid native snapshot")
        XCTAssertEqual(error, "Invalid native snapshot")
    }
}
