Pod::Spec.new do |s|
  s.name             = 'HealthPilotHealthKit'
  s.version          = '1.0.0'
  s.summary          = 'Comprehensive HealthKit plugin for HealthPilot'
  s.homepage         = 'https://healthpilot.pro'
  s.license          = 'MIT'
  s.author           = { 'HealthPilot' => 'info@healthpilot.pro' }
  s.source           = { :git => 'https://github.com/healthpilot/healthkit-plugin.git', :tag => s.version.to_s }
  s.source_files = 'Sources/**/*.{swift,h,m}'
  s.ios.deployment_target  = '14.0'
  s.swift_versions = '5.0'
  s.dependency 'Capacitor'
  s.frameworks = 'HealthKit'
end
