#!/usr/bin/env node

/**
 * Test suite for Feature Flags Service
 * 
 * Tests the core functionality of the feature flags system including
 * percentage-based rollouts, user overrides, and A/B testing.
 */

const { FeatureFlagsService, FlagConfig } = require('./feature-flags');

class FeatureFlagsTestSuite {
  constructor() {
    this.service = new FeatureFlagsService();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Feature Flags Service tests...\n');

    await this.testBasicFlagEvaluation();
    await this.testPercentageRollouts();
    await this.testUserOverrides();
    await this.testFlagManagement();
    await this.testConsistentHashing();
    await this.testAuditLogging();
    await this.testImportExport();

    this.printResults();
  }

  async testBasicFlagEvaluation() {
    console.log('📋 Testing basic flag evaluation...');

    // Test enabled flag
    await this.service.updateFlag('test-enabled', { enabled: true, rolloutPercentage: 100 });
    const enabledResult = this.service.evaluateFlag('test-enabled', 'user123');
    this.assert(enabledResult === true, 'Enabled flag should return true');

    // Test disabled flag
    await this.service.updateFlag('test-disabled', { enabled: false, rolloutPercentage: 100 });
    const disabledResult = this.service.evaluateFlag('test-disabled', 'user123');
    this.assert(disabledResult === false, 'Disabled flag should return false');

    // Test unknown flag
    const unknownResult = this.service.evaluateFlag('unknown-flag', 'user123');
    this.assert(unknownResult === false, 'Unknown flag should return false');

    console.log('✅ Basic flag evaluation tests passed\n');
  }

  async testPercentageRollouts() {
    console.log('📊 Testing percentage-based rollouts...');

    // Test 0% rollout
    await this.service.updateFlag('test-0-percent', { enabled: true, rolloutPercentage: 0 });
    const zeroPercentResults = [];
    for (let i = 0; i < 100; i++) {
      zeroPercentResults.push(this.service.evaluateFlag('test-0-percent', `user${i}`));
    }
    const zeroPercentEnabled = zeroPercentResults.filter(r => r).length;
    this.assert(zeroPercentEnabled === 0, '0% rollout should enable for 0 users');

    // Test 100% rollout
    await this.service.updateFlag('test-100-percent', { enabled: true, rolloutPercentage: 100 });
    const hundredPercentResults = [];
    for (let i = 0; i < 100; i++) {
      hundredPercentResults.push(this.service.evaluateFlag('test-100-percent', `user${i}`));
    }
    const hundredPercentEnabled = hundredPercentResults.filter(r => r).length;
    this.assert(hundredPercentEnabled === 100, '100% rollout should enable for all users');

    // Test 50% rollout (should be approximately 50%)
    await this.service.updateFlag('test-50-percent', { enabled: true, rolloutPercentage: 50 });
    const fiftyPercentResults = [];
    for (let i = 0; i < 1000; i++) {
      fiftyPercentResults.push(this.service.evaluateFlag('test-50-percent', `user${i}`));
    }
    const fiftyPercentEnabled = fiftyPercentResults.filter(r => r).length;
    const fiftyPercentRatio = fiftyPercentEnabled / 1000;
    this.assert(
      fiftyPercentRatio >= 0.45 && fiftyPercentRatio <= 0.55,
      `50% rollout should be approximately 50% (got ${(fiftyPercentRatio * 100).toFixed(1)}%)`
    );

    console.log('✅ Percentage rollout tests passed\n');
  }

  async testUserOverrides() {
    console.log('🎯 Testing user overrides...');

    // Create flag with 0% rollout
    await this.service.updateFlag('test-override', { enabled: true, rolloutPercentage: 0 });

    // Verify user is not in rollout
    const beforeOverride = this.service.evaluateFlag('test-override', 'user123');
    this.assert(beforeOverride === false, 'User should not be in 0% rollout');

    // Set user override to true
    this.service.setUserOverride('test-override', 'user123', true);
    const withOverride = this.service.evaluateFlag('test-override', 'user123');
    this.assert(withOverride === true, 'User override should enable flag');

    // Set user override to false (even with 100% rollout)
    await this.service.updateFlag('test-override', { rolloutPercentage: 100 });
    this.service.setUserOverride('test-override', 'user123', false);
    const overrideFalse = this.service.evaluateFlag('test-override', 'user123');
    this.assert(overrideFalse === false, 'User override should disable flag even with 100% rollout');

    // Remove override
    this.service.removeUserOverride('test-override', 'user123');
    const afterRemoval = this.service.evaluateFlag('test-override', 'user123');
    this.assert(afterRemoval === true, 'After removing override, should follow rollout percentage');

    console.log('✅ User override tests passed\n');
  }

  async testFlagManagement() {
    console.log('🏁 Testing flag management...');

    // Test flag creation
    const newFlag = await this.service.updateFlag('new-test-flag', {
      enabled: true,
      rolloutPercentage: 25,
      description: 'Test flag for management'
    });
    this.assert(newFlag.enabled === true, 'New flag should be created with correct properties');
    this.assert(newFlag.rolloutPercentage === 25, 'New flag should have correct rollout percentage');

    // Test flag update
    const updatedFlag = await this.service.updateFlag('new-test-flag', {
      rolloutPercentage: 75,
      description: 'Updated test flag'
    });
    this.assert(updatedFlag.rolloutPercentage === 75, 'Flag should be updated with new rollout percentage');
    this.assert(updatedFlag.enabled === true, 'Flag should retain previous enabled state');

    // Test flag retrieval
    const retrievedFlag = this.service.getFlagConfig('new-test-flag');
    this.assert(retrievedFlag !== null, 'Flag should be retrievable');
    this.assert(retrievedFlag.description === 'Updated test flag', 'Retrieved flag should have updated description');

    // Test flag listing
    const allFlags = this.service.listFlags();
    this.assert('new-test-flag' in allFlags, 'New flag should appear in flag listing');

    console.log('✅ Flag management tests passed\n');
  }

  async testConsistentHashing() {
    console.log('🔄 Testing consistent hashing...');

    await this.service.updateFlag('consistency-test', { enabled: true, rolloutPercentage: 50 });

    // Test that same user gets consistent results
    const user = 'consistency-user-123';
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(this.service.evaluateFlag('consistency-test', user));
    }

    const allSame = results.every(result => result === results[0]);
    this.assert(allSame, 'Same user should get consistent flag evaluation results');

    // Test that different flags give different distributions for same user
    await this.service.updateFlag('consistency-test-2', { enabled: true, rolloutPercentage: 50 });
    
    const flag1Result = this.service.evaluateFlag('consistency-test', user);
    const flag2Result = this.service.evaluateFlag('consistency-test-2', user);
    
    // Results might be the same, but the hashing should be different
    // We'll test this by checking multiple users
    let differentResults = 0;
    for (let i = 0; i < 100; i++) {
      const testUser = `hash-test-user-${i}`;
      const result1 = this.service.evaluateFlag('consistency-test', testUser);
      const result2 = this.service.evaluateFlag('consistency-test-2', testUser);
      if (result1 !== result2) {
        differentResults++;
      }
    }

    // With good hashing, we should see some different results
    this.assert(differentResults > 10, 'Different flags should produce different hash distributions');

    console.log('✅ Consistent hashing tests passed\n');
  }

  async testAuditLogging() {
    console.log('📝 Testing audit logging...');

    // Clear existing logs
    this.service.evaluationLog = [];

    // Perform some flag evaluations
    await this.service.updateFlag('audit-test', { enabled: true, rolloutPercentage: 100 });
    this.service.evaluateFlag('audit-test', 'audit-user-1');
    this.service.evaluateFlag('audit-test', 'audit-user-2');
    this.service.evaluateFlag('unknown-flag', 'audit-user-3');

    // Check logs
    const logs = this.service.getEvaluationLog();
    this.assert(logs.length >= 3, 'Should have logged flag evaluations');

    const evaluationLogs = logs.filter(log => log.type === 'EVALUATION');
    this.assert(evaluationLogs.length >= 3, 'Should have evaluation log entries');

    // Check log structure
    const firstLog = evaluationLogs[0];
    this.assert(firstLog.flagName !== undefined, 'Log should contain flag name');
    this.assert(firstLog.userId !== undefined, 'Log should contain anonymized user ID');
    this.assert(firstLog.result !== undefined, 'Log should contain evaluation result');
    this.assert(firstLog.reason !== undefined, 'Log should contain evaluation reason');
    this.assert(firstLog.timestamp !== undefined, 'Log should contain timestamp');

    // Test flag update logging
    await this.service.updateFlag('audit-test', { rolloutPercentage: 50 });
    const allLogs = this.service.getEvaluationLog();
    const updateLogs = allLogs.filter(log => log.type === 'UPDATE');
    this.assert(updateLogs.length >= 1, 'Should have logged flag updates');

    console.log('✅ Audit logging tests passed\n');
  }

  async testImportExport() {
    console.log('📦 Testing import/export functionality...');

    // Create some test flags
    await this.service.updateFlag('export-test-1', {
      enabled: true,
      rolloutPercentage: 25,
      description: 'First export test flag'
    });
    await this.service.updateFlag('export-test-2', {
      enabled: false,
      rolloutPercentage: 75,
      description: 'Second export test flag'
    });

    // Export flags
    const exported = this.service.exportFlags();
    this.assert(typeof exported === 'object', 'Export should return an object');
    this.assert('export-test-1' in exported, 'Export should contain test flags');
    this.assert('export-test-2' in exported, 'Export should contain all test flags');

    // Verify export structure
    const exportedFlag = exported['export-test-1'];
    this.assert(exportedFlag.enabled === true, 'Exported flag should have correct enabled state');
    this.assert(exportedFlag.rolloutPercentage === 25, 'Exported flag should have correct rollout percentage');
    this.assert(exportedFlag.description === 'First export test flag', 'Exported flag should have correct description');

    // Create new service instance for import test
    const newService = new FeatureFlagsService();
    
    // Import flags
    newService.importFlags(exported);
    
    // Verify imported flags
    const importedFlag = newService.getFlagConfig('export-test-1');
    this.assert(importedFlag !== null, 'Imported flag should exist');
    this.assert(importedFlag.enabled === true, 'Imported flag should have correct enabled state');
    this.assert(importedFlag.rolloutPercentage === 25, 'Imported flag should have correct rollout percentage');

    console.log('✅ Import/export tests passed\n');
  }

  assert(condition, message) {
    const result = {
      passed: condition,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
    }
  }

  printResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('📊 Test Results Summary:');
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log(`   Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.message}`));
      
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new FeatureFlagsTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { FeatureFlagsTestSuite };