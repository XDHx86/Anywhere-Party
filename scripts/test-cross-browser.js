#!/usr/bin/env node

/**
 * Cross-browser testing script
 * 
 * This script performs basic validation of the built extensions
 * and provides a framework for automated cross-browser testing.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Cross-Browser Extension Testing');
console.log('=====================================\n');

// Test 1: Verify build outputs exist
function testBuildOutputs() {
  console.log('📦 Testing Build Outputs...');
  
  const chromeDir = path.join(__dirname, '../dist/chrome');
  const firefoxDir = path.join(__dirname, '../dist/firefox');
  
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content-script.js',
    'popup.html',
    'popup-react.js',
    'options.html',
    'options-react.js',
    'extension-config.json'
  ];
  
  let chromePass = true;
  let firefoxPass = true;
  
  // Check Chrome build
  console.log('  Chrome MV3 build:');
  for (const file of requiredFiles) {
    const filePath = path.join(chromeDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`    ✅ ${file}`);
    } else {
      console.log(`    ❌ ${file} - MISSING`);
      chromePass = false;
    }
  }
  
  // Check Firefox build
  console.log('  Firefox build:');
  for (const file of requiredFiles) {
    const filePath = path.join(firefoxDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`    ✅ ${file}`);
    } else {
      console.log(`    ❌ ${file} - MISSING`);
      firefoxPass = false;
    }
  }
  
  return chromePass && firefoxPass;
}

// Test 2: Validate manifest differences
function testManifestCompatibility() {
  console.log('\n📋 Testing Manifest Compatibility...');
  
  try {
    const chromeManifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/chrome/manifest.json'), 'utf8')
    );
    const firefoxManifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/firefox/manifest.json'), 'utf8')
    );
    
    // Check Chrome MV3 specifics
    console.log('  Chrome MV3 manifest:');
    console.log(`    ✅ Manifest version: ${chromeManifest.manifest_version}`);
    console.log(`    ✅ Service worker: ${chromeManifest.background?.service_worker ? 'Yes' : 'No'}`);
    console.log(`    ✅ Action API: ${chromeManifest.action ? 'Yes' : 'No'}`);
    console.log(`    ✅ Host permissions: ${chromeManifest.host_permissions?.length || 0} entries`);
    
    // Check Firefox MV2 specifics  
    console.log('  Firefox manifest:');
    console.log(`    ✅ Manifest version: ${firefoxManifest.manifest_version}`);
    console.log(`    ✅ Background scripts: ${firefoxManifest.background?.scripts ? 'Yes' : 'No'}`);
    console.log(`    ✅ Browser action: ${firefoxManifest.browser_action ? 'Yes' : 'No'}`);
    console.log(`    ✅ Permissions: ${firefoxManifest.permissions?.length || 0} entries`);
    
    // Validate required differences
    const chromeValid = chromeManifest.manifest_version === 3 && 
                       chromeManifest.background?.service_worker &&
                       chromeManifest.action;
                       
    const firefoxValid = firefoxManifest.manifest_version === 2 && 
                        firefoxManifest.background?.scripts &&
                        firefoxManifest.browser_action;
    
    if (chromeValid && firefoxValid) {
      console.log('  ✅ Both manifests have correct browser-specific configurations');
      return true;
    } else {
      console.log('  ❌ Manifest validation failed');
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error reading manifests: ${error.message}`);
    return false;
  }
}

// Test 3: Check configuration compatibility
function testConfigurationCompatibility() {
  console.log('\n⚙️  Testing Configuration Compatibility...');
  
  try {
    const chromeConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/chrome/extension-config.json'), 'utf8')
    );
    const firefoxConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/firefox/extension-config.json'), 'utf8')
    );
    
    // Check if configs are identical (they should be)
    const configsMatch = JSON.stringify(chromeConfig) === JSON.stringify(firefoxConfig);
    
    if (configsMatch) {
      console.log('  ✅ Configuration files are identical across browsers');
      console.log(`  ✅ Signaling server: ${chromeConfig.SIGNALING_SERVER}`);
      console.log(`  ✅ Local dev mode: ${chromeConfig.LOCAL_DEV_MODE}`);
      console.log(`  ✅ Heartbeat interval: ${chromeConfig.HEARTBEAT_INTERVAL_MS}ms`);
      return true;
    } else {
      console.log('  ❌ Configuration files differ between browsers');
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error reading configurations: ${error.message}`);
    return false;
  }
}

// Test 4: Validate JavaScript bundle compatibility
function testJavaScriptCompatibility() {
  console.log('\n🔧 Testing JavaScript Compatibility...');
  
  const files = ['background.js', 'content-script.js', 'popup-react.js'];
  let allValid = true;
  
  for (const file of files) {
    console.log(`  Checking ${file}:`);
    
    try {
      const chromeContent = fs.readFileSync(
        path.join(__dirname, `../dist/chrome/${file}`), 'utf8'
      );
      const firefoxContent = fs.readFileSync(
        path.join(__dirname, `../dist/firefox/${file}`), 'utf8'
      );
      
      // Check for browser-specific API usage
      const chromeHasWebExtPolyfill = chromeContent.includes('webextension-polyfill');
      const firefoxHasWebExtPolyfill = firefoxContent.includes('webextension-polyfill');
      
      console.log(`    ✅ Chrome size: ${(chromeContent.length / 1024).toFixed(1)}KB`);
      console.log(`    ✅ Firefox size: ${(firefoxContent.length / 1024).toFixed(1)}KB`);
      console.log(`    ✅ WebExt polyfill: Chrome=${chromeHasWebExtPolyfill}, Firefox=${firefoxHasWebExtPolyfill}`);
      
      // Files should be similar in size (within 10%)
      const sizeDiff = Math.abs(chromeContent.length - firefoxContent.length) / chromeContent.length;
      if (sizeDiff > 0.1) {
        console.log(`    ⚠️  Size difference: ${(sizeDiff * 100).toFixed(1)}% (may indicate build issues)`);
      }
      
    } catch (error) {
      console.log(`    ❌ Error reading ${file}: ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

// Test 5: Check for common compatibility issues
function testCommonIssues() {
  console.log('\n🔍 Checking for Common Compatibility Issues...');
  
  const issues = [];
  
  try {
    // Check for Chrome-specific APIs in Firefox build
    const firefoxBackground = fs.readFileSync(
      path.join(__dirname, '../dist/firefox/background.js'), 'utf8'
    );
    
    // Check for proper browser API usage patterns
    // Both builds should contain both chrome.* and browser.* APIs due to browser bridge abstraction.
    // After webpack chunking, these references may land in core-modules.js rather than background.js,
    // so we scan ALL .js files in the dist directory.
    const readAllJs = (dir) => {
      return fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f =>
        fs.readFileSync(path.join(dir, f), 'utf8')
      ).join('\n');
    };
    const firefoxAllJs = readAllJs(path.join(__dirname, '../dist/firefox'));
    const chromeAllJs = readAllJs(path.join(__dirname, '../dist/chrome'));

    const hasChromeBrowserAPIs = firefoxAllJs.includes('chrome.runtime') && firefoxAllJs.includes('browser.runtime');
    const hasBrowserDetection = firefoxAllJs.includes('chrome') && firefoxAllJs.includes('firefox');
    
    if (!hasChromeBrowserAPIs) {
      issues.push('Firefox build missing expected browser API references');
    }
    
    if (!hasBrowserDetection) {
      issues.push('Firefox build missing browser detection logic');
    }
    
    // Check Chrome build (scan all JS files, not just background.js)
    const chromeHasBrowserAPIs = chromeAllJs.includes('chrome.runtime') && chromeAllJs.includes('browser.runtime');
    const chromeHasBrowserDetection = chromeAllJs.includes('chrome') && chromeAllJs.includes('firefox');
    
    if (!chromeHasBrowserAPIs) {
      issues.push('Chrome build missing expected browser API references');
    }
    
    if (!chromeHasBrowserDetection) {
      issues.push('Chrome build missing browser detection logic');
    }
    
    // Check for service worker compatibility
    if (firefoxBackground.includes('importScripts')) {
      issues.push('Firefox build contains importScripts (MV2 only)');
    }
    
    if (issues.length === 0) {
      console.log('  ✅ No common compatibility issues detected');
      return true;
    } else {
      console.log('  ❌ Compatibility issues found:');
      issues.forEach(issue => console.log(`    - ${issue}`));
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error checking compatibility: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  const tests = [
    { name: 'Build Outputs', fn: testBuildOutputs },
    { name: 'Manifest Compatibility', fn: testManifestCompatibility },
    { name: 'Configuration Compatibility', fn: testConfigurationCompatibility },
    { name: 'JavaScript Compatibility', fn: testJavaScriptCompatibility },
    { name: 'Common Issues', fn: testCommonIssues }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" failed with error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All cross-browser compatibility tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Load extensions in both Chrome and Firefox');
    console.log('2. Follow the manual testing guide in docs/cross-browser-testing.md');
    console.log('3. Verify all functionality works as expected');
    console.log('4. Update task status to completed');
    return true;
  } else {
    console.log('❌ Some tests failed. Please review the issues above.');
    console.log('\n🔧 Recommended Actions:');
    console.log('1. Fix any build or configuration issues');
    console.log('2. Re-run the build process: npm run build');
    console.log('3. Run this test script again');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };