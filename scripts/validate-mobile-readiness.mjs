#!/usr/bin/env node

/**
 * Mobile Readiness Validation Script
 * 
 * Comprehensive validation suite for mobile app readiness.
 * Checks Capacitor config, plugins, iOS build, permissions, and more.
 * 
 * Usage: node scripts/validate-mobile-readiness.mjs [--json]
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const projectRoot = resolve(process.cwd());
const outputJson = process.argv.includes('--json');

const results = {
  checks: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

function check(name, fn) {
  results.summary.total++;
  
  try {
    const result = fn();
    const status = result.status || 'pass';
    
    results.checks.push({
      name,
      status,
      message: result.message || 'OK',
      details: result.details,
    });
    
    if (status === 'pass') results.summary.passed++;
    else if (status === 'warning') results.summary.warnings++;
    else results.summary.failed++;
    
    return status === 'pass';
  } catch (error) {
    results.checks.push({
      name,
      status: 'fail',
      message: error.message,
    });
    results.summary.failed++;
    return false;
  }
}

// ========== Validation Checks ==========

check('Capacitor Config Exists', () => {
  const configPath = join(projectRoot, 'capacitor.config.ts');
  if (!existsSync(configPath)) {
    return { status: 'fail', message: 'capacitor.config.ts not found' };
  }
  
  const config = readFileSync(configPath, 'utf-8');
  if (!config.includes('com.nuvitae.healthpilot')) {
    return { 
      status: 'warning', 
      message: 'App ID does not match spec (expected com.nuvitae.healthpilot)' 
    };
  }
  
  return { status: 'pass', message: 'Capacitor config valid' };
});

check('iOS Platform Exists', () => {
  const iosPath = join(projectRoot, 'ios');
  if (!existsSync(iosPath)) {
    return { status: 'fail', message: 'iOS platform not added (run: npx cap add ios)' };
  }
  return { status: 'pass', message: 'iOS platform found' };
});

check('Required Capacitor Plugins Installed', () => {
  const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredPlugins = [
    '@capacitor/core',
    '@capacitor/app',
    '@capacitor/keyboard',
    '@capacitor/status-bar',
    '@capacitor/haptics',
    '@capacitor/splash-screen',
    '@capacitor/preferences',
    '@capacitor/filesystem',
    '@capacitor/browser',
    '@capacitor/share',
    '@aparajita/capacitor-secure-storage',
  ];
  
  const missing = requiredPlugins.filter(plugin => !deps[plugin]);
  
  if (missing.length > 0) {
    return { 
      status: 'fail', 
      message: `Missing plugins: ${missing.join(', ')}`,
      details: { missing }
    };
  }
  
  return { status: 'pass', message: `All ${requiredPlugins.length} required plugins installed` };
});

check('Info.plist Privacy Keys', () => {
  const plistPath = join(projectRoot, 'ios/App/App/Info.plist');
  if (!existsSync(plistPath)) {
    return { status: 'fail', message: 'Info.plist not found' };
  }
  
  const plist = readFileSync(plistPath, 'utf-8');
  const requiredKeys = [
    'NSHealthShareUsageDescription',
    'NSHealthUpdateUsageDescription',
  ];
  
  const missing = requiredKeys.filter(key => !plist.includes(key));
  
  if (missing.length > 0) {
    return { 
      status: 'fail', 
      message: `Missing privacy keys: ${missing.join(', ')}`,
      details: { missing }
    };
  }
  
  return { status: 'pass', message: 'All required privacy keys present' };
});

check('MobileBootstrap Exists', () => {
  const bootstrapPath = join(projectRoot, 'client/src/mobile/MobileBootstrap.ts');
  if (!existsSync(bootstrapPath)) {
    return { status: 'fail', message: 'MobileBootstrap.ts not found' };
  }
  return { status: 'pass', message: 'Mobile bootstrap found' };
});

check('Mobile Adapters Exist', () => {
  const adapterPath = join(projectRoot, 'client/src/mobile/adapters');
  if (!existsSync(adapterPath)) {
    return { status: 'fail', message: 'Mobile adapters directory not found' };
  }
  
  const requiredAdapters = [
    'SecureStorageAdapter.ts',
    'HealthKitAdapter.ts',
    'HapticsAdapter.ts',
    'ShareAdapter.ts',
    'BrowserAdapter.ts',
  ];
  
  const missing = requiredAdapters.filter(adapter => 
    !existsSync(join(adapterPath, adapter))
  );
  
  if (missing.length > 0) {
    return { 
      status: 'fail', 
      message: `Missing adapters: ${missing.join(', ')}`,
      details: { missing }
    };
  }
  
  return { status: 'pass', message: `All ${requiredAdapters.length} adapters found` };
});

check('Native Diagnostics Screen Exists', () => {
  const diagnosticsPath = join(
    projectRoot, 
    'client/src/mobile/features/diagnostics/NativeDiagnostics.tsx'
  );
  if (!existsSync(diagnosticsPath)) {
    return { status: 'fail', message: 'Native diagnostics screen not found' };
  }
  return { status: 'pass', message: 'Native diagnostics screen found' };
});

check('Build Output Directory', () => {
  const distPath = join(projectRoot, 'dist/public');
  if (!existsSync(distPath)) {
    return { 
      status: 'warning', 
      message: 'Build not run yet (run: npm run build)' 
    };
  }
  return { status: 'pass', message: 'Build output directory exists' };
});

check('TypeScript Compilation', () => {
  try {
    execSync('npx tsc --noEmit', { 
      cwd: projectRoot, 
      stdio: 'pipe',
      timeout: 30000 
    });
    return { status: 'pass', message: 'TypeScript compilation successful' };
  } catch (error) {
    return { 
      status: 'warning', 
      message: 'TypeScript has compilation errors (check with: npx tsc --noEmit)' 
    };
  }
});

check('Documentation Files', () => {
  const docs = [
    'OPERATIONS.md',
    'MOBILE_READINESS_CHECKLIST.md',
    'TEST_PLAN_IOS.md',
  ];
  
  const missing = docs.filter(doc => !existsSync(join(projectRoot, doc)));
  
  if (missing.length > 0) {
    return { 
      status: 'warning', 
      message: `Missing documentation: ${missing.join(', ')}`,
      details: { missing }
    };
  }
  
  return { status: 'pass', message: 'All documentation files present' };
});

// ========== Output Results ==========

if (outputJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log('\n='.repeat(80));
  console.log('📱 MOBILE READINESS VALIDATION');
  console.log('='.repeat(80) + '\n');
  
  results.checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : 
                 check.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}`);
    if (check.details) {
      console.log(`   Details: ${JSON.stringify(check.details)}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Checks: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log('='.repeat(80) + '\n');
  
  if (results.summary.failed > 0) {
    console.log('❌ VALIDATION FAILED');
    process.exit(1);
  } else if (results.summary.warnings > 0) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS');
    process.exit(0);
  } else {
    console.log('✅ VALIDATION PASSED');
    process.exit(0);
  }
}
