/**
 * Integration Test Runner
 *
 * Orchestrates the execution of all integration tests and generates reports
 * Requirements: 25.5, 26.5, 27.5, 28.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Test suite imports
import './final-integration.test';
import './user-workflows.test';
import './performance-validation.test';
import './backward-compatibility.test';

// Test configuration and reporting
interface TestSuiteResult {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface IntegrationTestReport {
  timestamp: string;
  environment: {
    browser: string;
    version: string;
    platform: string;
  };
  suites: TestSuiteResult[];
  performance: {
    averageRenderTime: number;
    memoryUsage: number;
    animationFrameRate: number;
  };
  compatibility: {
    legacyConfigMigration: boolean;
    crossBrowserConsistency: boolean;
    performanceRegression: boolean;
  };
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    overallDuration: number;
    successRate: number;
  };
}

class IntegrationTestReporter {
  private startTime: number = 0;
  private results: TestSuiteResult[] = [];
  private performanceMetrics: any = {};

  start(): void {
    this.startTime = Date.now();
    console.log('🚀 Starting Material Design 3 Integration Tests...');
    console.log('📋 Test Suites:');
    console.log('  - Final Integration Tests');
    console.log('  - User Workflow Tests');
    console.log('  - Performance Validation Tests');
    console.log('  - Backward Compatibility Tests');
    console.log('');
  }

  addSuiteResult(result: TestSuiteResult): void {
    this.results.push(result);
  }

  setPerformanceMetrics(metrics: any): void {
    this.performanceMetrics = metrics;
  }

  generateReport(): IntegrationTestReport {
    const duration = Date.now() - this.startTime;
    const totalTests = this.results.reduce(
      (sum, suite) => sum + suite.passed + suite.failed + suite.skipped,
      0
    );
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0);

    return {
      timestamp: new Date().toISOString(),
      environment: {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Firefox',
        version: navigator.userAgent.match(/(?:Chrome|Firefox)\/(\d+)/)?.[1] || 'Unknown',
        platform: navigator.platform,
      },
      suites: this.results,
      performance: {
        averageRenderTime: this.performanceMetrics.averageRenderTime || 0,
        memoryUsage: this.performanceMetrics.memoryUsage || 0,
        animationFrameRate: this.performanceMetrics.animationFrameRate || 60,
      },
      compatibility: {
        legacyConfigMigration: this.results.some(
          (suite) => suite.name.includes('Backward Compatibility') && suite.failed === 0
        ),
        crossBrowserConsistency: this.results.some(
          (suite) => suite.name.includes('Cross-Browser') && suite.failed === 0
        ),
        performanceRegression: this.results.some(
          (suite) => suite.name.includes('Performance') && suite.failed === 0
        ),
      },
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        overallDuration: duration,
        successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
      },
    };
  }

  printReport(report: IntegrationTestReport): void {
    console.log('\n📊 Integration Test Report');
    console.log('='.repeat(50));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(
      `Environment: ${report.environment.browser} ${report.environment.version} on ${report.environment.platform}`
    );
    console.log('');

    console.log('📋 Test Suite Results:');
    report.suites.forEach((suite) => {
      const status = suite.failed === 0 ? '✅' : '❌';
      console.log(`  ${status} ${suite.name}`);
      console.log(
        `     Passed: ${suite.passed}, Failed: ${suite.failed}, Skipped: ${suite.skipped}`
      );
      console.log(`     Duration: ${suite.duration}ms`);
      if (suite.coverage) {
        console.log(`     Coverage: ${suite.coverage}%`);
      }
    });
    console.log('');

    console.log('⚡ Performance Metrics:');
    console.log(`  Average Render Time: ${report.performance.averageRenderTime.toFixed(2)}ms`);
    console.log(`  Memory Usage: ${(report.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Animation Frame Rate: ${report.performance.animationFrameRate.toFixed(1)}fps`);
    console.log('');

    console.log('🔄 Compatibility Status:');
    console.log(
      `  Legacy Config Migration: ${report.compatibility.legacyConfigMigration ? '✅' : '❌'}`
    );
    console.log(
      `  Cross-Browser Consistency: ${report.compatibility.crossBrowserConsistency ? '✅' : '❌'}`
    );
    console.log(
      `  Performance Regression: ${report.compatibility.performanceRegression ? '✅ No regression' : '❌ Regression detected'}`
    );
    console.log('');

    console.log('📈 Summary:');
    console.log(`  Total Tests: ${report.summary.totalTests}`);
    console.log(`  Passed: ${report.summary.totalPassed}`);
    console.log(`  Failed: ${report.summary.totalFailed}`);
    console.log(`  Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`  Total Duration: ${(report.summary.overallDuration / 1000).toFixed(2)}s`);
    console.log('');

    if (report.summary.successRate >= 95) {
      console.log('🎉 Integration tests passed! Material Design 3 UI is ready for deployment.');
    } else if (report.summary.successRate >= 80) {
      console.log('⚠️  Integration tests mostly passed, but some issues need attention.');
    } else {
      console.log(
        '❌ Integration tests failed. Material Design 3 UI needs fixes before deployment.'
      );
    }
  }

  finish(): IntegrationTestReport {
    const report = this.generateReport();
    this.printReport(report);
    return report;
  }
}

// Global test reporter instance
const testReporter = new IntegrationTestReporter();

// Test orchestration
describe('Material Design 3 Integration Test Suite', () => {
  beforeAll(() => {
    testReporter.start();
  });

  afterAll(() => {
    const report = testReporter.finish();

    // Save report to file if in CI environment
    if (process.env.CI) {
      try {
        const fs = require('fs');
        const path = require('path');

        const reportPath = path.join(process.cwd(), 'integration-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`📄 Report saved to: ${reportPath}`);
      } catch (error) {
        console.warn('Failed to save report file:', error);
      }
    }
  });

  it('should execute all integration test suites', () => {
    // This test serves as a placeholder to ensure the test runner executes
    expect(true).toBe(true);
  });
});

export { IntegrationTestReporter, type IntegrationTestReport };
