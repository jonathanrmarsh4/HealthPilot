Pod::Spec.new do |s|
  s.name             = 'HealthPilotHealthKit'
  s.version          = '1.0.0'
  s.summary          = 'HealthPilot Custom HealthKit Plugin - Extended from Capgo Health'
  s.license          = 'MIT'
  s.homepage         = 'https://healthpilot.pro'
  s.author           = 'HealthPilot'
  s.source           = { :git => '', :tag => s.version.to_s }
  s.source_files     = 'Sources/HealthPilotHealthKit/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.swift_version    = '5.1'
  s.dependency 'Capacitor'
  s.frameworks       = 'HealthKit'
end
