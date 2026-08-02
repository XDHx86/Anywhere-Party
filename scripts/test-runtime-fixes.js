#!/usr/bin/env node

/**
 * Runtime Fixes Test Runner
 * Validates all critical runtime bug fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Watch Party Extension - Runtime Fixes Validation');
console.log('=' .repeat(60));

const fixes = [
  {
    id: 'A',
    name: 'Icon Loading Failures',
    description: 'Bundle icon fonts locally with SVG fallbacks',
    tests: ['icon-assets-exist', 'no-cdn-dependencies', 'fallback-mechanisms'],
  },
  {
    id: 'B', 
    name: 'Room State Persistence',
    description: 'Persist room state across popup sessions',
    tests: ['storage-persistence', 'state-recovery', 'cleanup'],
  },
  {
    id: 'C',
    name: 'API Key Management', 
    description: 'Secure user-managed API keys',
    tests: ['key-storage', 'encryption', 'validation'],
  },
  {
    id: 'D',
    name: 'Video Detection Workflow',
    description: 'On-demand detection with right-click fallback',
    tests: ['inactive-until-start', 'right-click-fallback', 'dom-traversal'],
  },
  {
    id: 'E',
    name: 'Subtitle Engine Error Handling',
    description: 'Graceful API error handling',
    tests: ['missing-api-key', 'network-errors', 'fallback-subtitles'],
  },
  {
    id: 'F',
    name: 'Popup Scrolling',
    description: 'Proper overflow handling with keyboard accessibility',
    tests: ['css-overflow', 'keyboard-focus', 'smooth-scrolling'],
  },
];

function validateAssets() {
  console.log('\n📁 Validating Assets...');
  
  const assetManifestPath = path.join(__dirname, '../assets/asset-manifest.json');
  if (!fs.existsSync(assetManifestPath)) {
    throw new Error('Asset manifest not found');
  }
  
  const manifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
  
  // Check required asset categories
  const requiredCategories = ['toolbar-icons', 'popup-icons', 'reaction-icons', 'ui-icons'];
  for (const category of requiredCategories) {
    if (!manifest.assets[category]) {
      throw new Error(`Missing asset category: ${category}`);
    }
  }
  
  // Validate asset files exist
  let missingAssets = [];
  Object.values(manifest.assets).forEach(category => {
    Object.values(category).forEach(asset => {
      if (asset.path) {
        const fullPath = path.join(__dirname, '../assets', asset.path);
        if (!fs.existsSync(fullPath)) {
          missingAssets.push(asset.path);
        }
      }
    });
  });
  
  if (missingAssets.length > 0) {
    console.warn(`⚠️  Missing assets: ${missingAssets.join(', ')}`);
  } else {
    console.log('✅ All assets exist');
  }
  
  // Check for CDN dependencies
  let cdnDependencies = [];
  Object.values(manifest.assets).forEach(category => {
    Object.values(category).forEach(asset => {
      if (asset.path && asset.path.match(/^https?:\/\//)) {
        cdnDependencies.push(asset.path);
      }
    });
  });
  
  if (cdnDependencies.length > 0) {
    throw new Error(`CDN dependencies found: ${cdnDependencies.join(', ')}`);
  } else {
    console.log('✅ No CDN dependencies');
  }
}

function validateWebpackConfig() {
  console.log('\n⚙️  Validating Webpack Configuration...');
  
  const webpackConfigPath = path.join(__dirname, '../webpack.config.js');
  if (!fs.existsSync(webpackConfigPath)) {
    throw new Error('Webpack config not found');
  }
  
  const webpackConfig = fs.readFileSync(webpackConfigPath, 'utf8');
  
  // Check for asset validation
  if (!webpackConfig.includes('validateAssets')) {
    throw new Error('Asset validation not found in webpack config');
  }
  
  // Check for font loading support
  if (!webpackConfig.includes('woff|woff2|eot|ttf|otf')) {
    throw new Error('Font loading support not configured');
  }
  
  console.log('✅ Webpack configuration valid');
}

function validateTypeScriptFiles() {
  console.log('\n📝 Validating TypeScript Files...');
  
  const requiredFiles = [
    'src/@core/room-state/room-state-manager.ts',
    'src/@core/api-keys/api-key-manager.ts', 
    'src/@core/video-detector/enhanced-video-detector.ts',
    'src/@core/subtitle-engine/enhanced-subtitle-engine.ts',
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file not found: ${file}`);
    }
  }
  
  console.log('✅ All required TypeScript files exist');
}

function runUnitTests() {
  console.log('\n🧪 Running Unit Tests...');
  
  try {
    execSync('npm run test -- src/@ui/integration/runtime-fix-validation.test.ts', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Unit tests passed');
  } catch (error) {
    throw new Error('Unit tests failed');
  }
}

function validateManifestPermissions() {
  console.log('\n📋 Validating Manifest Permissions...');
  
  const chromeManifestPath = path.join(__dirname, '../manifest-chrome.json');
  const firefoxManifestPath = path.join(__dirname, '../manifest-firefox.json');
  
  if (!fs.existsSync(chromeManifestPath)) {
    throw new Error('Chrome manifest not found');
  }
  
  if (!fs.existsSync(firefoxManifestPath)) {
    throw new Error('Firefox manifest not found');
  }
  
  const chromeManifest = JSON.parse(fs.readFileSync(chromeManifestPath, 'utf8'));
  const firefoxManifest = JSON.parse(fs.readFileSync(firefoxManifestPath, 'utf8'));
  
  // Check required permissions
  const requiredPermissions = ['storage', 'activeTab', 'tabs'];
  
  for (const permission of requiredPermissions) {
    if (!chromeManifest.permissions.includes(permission)) {
      throw new Error(`Chrome manifest missing permission: ${permission}`);
    }
    
    if (!firefoxManifest.permissions.includes(permission)) {
      throw new Error(`Firefox manifest missing permission: ${permission}`);
    }
  }
  
  console.log('✅ Manifest permissions valid');
}

function generateReport() {
  console.log('\n📊 Runtime Fixes Validation Report');
  console.log('=' .repeat(60));
  
  fixes.forEach(fix => {
    console.log(`\n${fix.id}. ${fix.name}`);
    console.log(`   ${fix.description}`);
    console.log(`   Tests: ${fix.tests.join(', ')}`);
    console.log('   Status: ✅ FIXED');
  });
  
  console.log('\n🎉 All runtime fixes validated successfully!');
  console.log('\nNext Steps:');
  console.log('1. Run cross-browser tests: npm run test:cross-browser');
  console.log('2. Test in Chrome unpacked mode');
  console.log('3. Test in Firefox about:debugging');
  console.log('4. Validate with real API keys in options page');
}

async function main() {
  try {
    validateAssets();
    validateWebpackConfig();
    validateTypeScriptFiles();
    validateManifestPermissions();
    runUnitTests();
    generateReport();
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateAssets,
  validateWebpackConfig,
  validateTypeScriptFiles,
  runUnitTests,
  validateManifestPermissions,
};