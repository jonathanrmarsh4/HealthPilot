Pod::Spec.new do |s|
  s.name             = 'HealthPilotHealthKit'
  s.version          = '1.0.0'
  s.summary          = 'Capacitor plugin for HealthKit integration'
  s.homepage         = 'https://healthpilot.pro'
  s.license          = { :type => 'MIT', :text => 'MIT License' }
  s.author           = { 'HealthPilot' => 'dev@healthpilot.pro' }
  s.source           = { :path => '.' }
  
  s.ios.deployment_target = '14.0'
  s.swift_version = '5.0'
  
  s.source_files = '../App/*.{swift,h,m}'
  s.public_header_files = '../App/*.h'
  
  s.dependency 'Capacitor'
  s.dependency 'CapacitorCordova'
  
  s.frameworks = 'HealthKit'
  
  s.xcconfig = {
    'SWIFT_OBJC_BRIDGING_HEADER' => '$(PODS_TARGET_SRCROOT)/../App/HealthPilotHealthKit.m'
  }
end