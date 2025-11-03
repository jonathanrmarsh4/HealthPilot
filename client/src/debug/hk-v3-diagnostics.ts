/**
 * HealthKit V3 Plugin Diagnostics
 * 
 * Use this to verify that the V3 plugin is properly registered
 * and all methods are exported.
 * 
 * Usage:
 *   import { printHKV3Diagnostics, testAllV3Methods } from '@/debug/hk-v3-diagnostics';
 *   printHKV3Diagnostics();
 *   testAllV3Methods();
 */

import { Capacitor } from '@capacitor/core';

/**
 * Print all available Capacitor plugins and specifically check for HealthPilotHKV3
 */
export function printHKV3Diagnostics() {
  console.group('🔍 [HK V3 Diagnostics] Plugin Registration Check');
  
  const plugins = (window as any).Capacitor?.Plugins || {};
  const pluginNames = Object.keys(plugins);
  
  console.log('✅ Total Capacitor plugins registered:', pluginNames.length);
  console.log('📋 All plugin IDs:', pluginNames.sort());
  
  console.log('\n🔎 Looking for HealthPilotHKV3...');
  
  if (plugins.HealthPilotHKV3) {
    console.log('✅ HealthPilotHKV3 plugin FOUND!');
    console.log('📦 Plugin object:', plugins.HealthPilotHKV3);
    console.log('🔧 Available methods:', Object.keys(plugins.HealthPilotHKV3).filter(key => 
      typeof plugins.HealthPilotHKV3[key] === 'function'
    ));
  } else {
    console.error('❌ HealthPilotHKV3 plugin NOT FOUND');
    console.log('💡 Looking for old plugin IDs...');
    
    if (plugins.HealthKitStatsPlugin) {
      console.warn('⚠️  Found old HealthKitStatsPlugin (V2)');
    }
    if (plugins.HealthKitBackgroundSyncPlugin) {
      console.warn('⚠️  Found old HealthKitBackgroundSyncPlugin');
    }
  }
  
  console.groupEnd();
  
  return !!plugins.HealthPilotHKV3;
}

/**
 * Test all V3 methods to ensure they're callable
 */
export async function testAllV3Methods() {
  console.group('🧪 [HK V3 Diagnostics] Method Callability Test');
  
  const plugins = (window as any).Capacitor?.Plugins || {};
  const plugin = plugins.HealthPilotHKV3;
  
  if (!plugin) {
    console.error('❌ Cannot test - HealthPilotHKV3 not registered');
    console.groupEnd();
    return;
  }
  
  const testResults: Record<string, 'success' | 'error' | 'missing'> = {};
  
  // Test getSyncStatus (safe to call without permissions)
  console.log('\n🔬 Testing getSyncStatus...');
  try {
    const result = await plugin.getSyncStatus();
    console.log('✅ getSyncStatus:', result);
    testResults.getSyncStatus = 'success';
  } catch (error) {
    console.error('❌ getSyncStatus error:', error);
    testResults.getSyncStatus = 'error';
  }
  
  // Test getBackgroundQueueStats (safe to call)
  console.log('\n🔬 Testing getBackgroundQueueStats...');
  try {
    const result = await plugin.getBackgroundQueueStats();
    console.log('✅ getBackgroundQueueStats:', result);
    testResults.getBackgroundQueueStats = 'success';
  } catch (error) {
    console.error('❌ getBackgroundQueueStats error:', error);
    testResults.getBackgroundQueueStats = 'error';
  }
  
  // Check if other methods exist (don't call them - they need permissions)
  const methodsToCheck = [
    'getDailySteps',
    'getMultiDayStats',
    'enableBackgroundDelivery',
    'disableBackgroundDelivery',
    'triggerBackgroundSyncNow',
    'drainBackgroundQueue',
    'resetAnchors'
  ];
  
  console.log('\n🔬 Checking for method existence (not calling)...');
  for (const methodName of methodsToCheck) {
    if (typeof plugin[methodName] === 'function') {
      console.log(`✅ ${methodName}: exists`);
      testResults[methodName] = 'success';
    } else {
      console.error(`❌ ${methodName}: MISSING`);
      testResults[methodName] = 'missing';
    }
  }
  
  console.log('\n📊 Test Summary:');
  const successCount = Object.values(testResults).filter(r => r === 'success').length;
  const totalCount = Object.keys(testResults).length;
  console.log(`✅ ${successCount}/${totalCount} methods OK`);
  
  if (successCount === totalCount) {
    console.log('🎉 ALL METHODS REGISTERED SUCCESSFULLY!');
  } else {
    console.error('⚠️  Some methods missing or errored');
  }
  
  console.groupEnd();
  
  return testResults;
}

/**
 * Quick test to verify the plugin works end-to-end
 * This tests the foreground sync method which should work without background setup
 */
export async function testForegroundSync() {
  console.group('🚀 [HK V3 Diagnostics] Foreground Sync Test');
  
  const plugins = (window as any).Capacitor?.Plugins || {};
  const plugin = plugins.HealthPilotHKV3;
  
  if (!plugin) {
    console.error('❌ HealthPilotHKV3 not registered');
    console.groupEnd();
    return;
  }
  
  console.log('🔬 Calling triggerBackgroundSyncNow (foreground test)...');
  console.log('⏳ This may take a few seconds...');
  
  try {
    const result = await plugin.triggerBackgroundSyncNow();
    console.log('✅ Foreground sync succeeded!');
    console.log('📦 Result:', result);
    
    // Check queue stats after sync
    const stats = await plugin.getBackgroundQueueStats();
    console.log('📊 Queue stats after sync:', stats);
    
    console.log('🎉 FOREGROUND SYNC TEST PASSED!');
  } catch (error: any) {
    console.error('❌ Foreground sync failed:', error);
    
    if (error.code === 'UNIMPLEMENTED') {
      console.error('💥 UNIMPLEMENTED ERROR - Method not registered properly!');
    }
  }
  
  console.groupEnd();
}

/**
 * Run all diagnostics in sequence
 */
export async function runFullDiagnostics() {
  console.log('🔬 ======================================');
  console.log('🔬 HK V3 FULL DIAGNOSTICS');
  console.log('🔬 ======================================\n');
  
  const isRegistered = printHKV3Diagnostics();
  
  if (!isRegistered) {
    console.error('\n❌ Plugin not registered. Cannot proceed with tests.');
    console.log('💡 Check:');
    console.log('   1. HealthKitStatsPluginV3.m is in Build Phases → Compile Sources');
    console.log('   2. HealthKitStatsPluginV3.swift is in Build Phases → Compile Sources');
    console.log('   3. App was rebuilt from .xcworkspace');
    console.log('   4. App was deleted and freshly installed');
    return;
  }
  
  await testAllV3Methods();
  
  console.log('\n💡 To test with real HealthKit data, call:');
  console.log('   testForegroundSync()');
  
  console.log('\n🔬 ======================================');
  console.log('🔬 DIAGNOSTICS COMPLETE');
  console.log('🔬 ======================================');
}
