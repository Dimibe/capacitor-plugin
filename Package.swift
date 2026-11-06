// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "RdlaboCapacitorNativeUi",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RdlaboCapacitorNativeUi", targets: ["NativeUIPlugin"]),
        .library(name: "NativeUICore", targets: ["NativeUICore"])
    ],
    dependencies: [.package(url: "https://github.com/webview-native-ui/engine.git", exact: "1.0.3"), .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")],
    targets: [.target(
        name: "NativeUICore",
        dependencies: [.product(name: "WebViewNativeUIEngine", package: "engine")],
        path: "packages/native-ui-core/ios/Sources/NativeUICore"
    ), .target(
        name: "NativeUIPlugin",
        dependencies: [
            "NativeUICore",
            .product(name: "WebViewNativeUIEngine", package: "engine"),
            .product(name: "Capacitor", package: "capacitor-swift-pm"),
            .product(name: "Cordova", package: "capacitor-swift-pm")
        ],
        path: "ios/Sources/NativeUIPlugin"
    ), .testTarget(
        name: "NativeUIPluginTests",
        dependencies: ["NativeUIPlugin", "NativeUICore"],
        path: "ios/Tests/NativeUIPluginTests"
    ), .testTarget(
        name: "NativeUICoreTests",
        dependencies: ["NativeUICore"],
        path: "packages/native-ui-core/ios/Tests/NativeUICoreTests"
    )]
)
