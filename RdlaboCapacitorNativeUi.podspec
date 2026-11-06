require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'RdlaboCapacitorNativeUi'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url'].sub(/^git\+/, '').sub(/\.git$/, '')
  s.author = package['author']
  s.source = { :git => package['repository']['url'].sub(/^git\+/, ''), :tag => "capacitor-v#{s.version}" }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}', 'packages/native-ui-core/ios/Sources/**/*.swift'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.dependency 'WebViewNativeUIEngine', '1.0.3'
  s.swift_version = '5.9'
end
