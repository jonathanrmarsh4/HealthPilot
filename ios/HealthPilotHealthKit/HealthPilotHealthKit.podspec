Pod::Spec.new do |s|
  s.name             = 'HealthPilotHealthKit'
  s.version          = '1.0.0'
  s.summary          = 'Comprehensive HealthKit plugin for HealthPilot'
  s.homepage         = 'https://healthpilot.pro'
  s.license          = 'MIT'
  s.author           = { 'HealthPilot' => 'info@healthpilot.pro' }
  s.source           = { :path => '.' }
  s.source_files = 'Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.swift_version = '5.9'
  s.dependency 'Capacitor'
  s.static_framework = true
  s.requires_arc = true
  s.frameworks = 'HealthKit'
end
