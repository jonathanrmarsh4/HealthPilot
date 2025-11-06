Pod::Spec.new do |s|
  s.name = 'HealthKitPlugin'
  s.version = '1.0.0'
  s.summary = 'Extended HealthKit plugin with 26 data types'
  s.license = 'MIT'
  s.homepage = 'https://github.com/healthpilot'
  s.author = 'HealthPilot'
  s.source = { :path => '.' }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target  = '13.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
  s.frameworks = 'HealthKit'
end
