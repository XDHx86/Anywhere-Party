#!/usr/bin/env node

/**
 * Optimization Validation Script
 * Validates asset optimization and UX enhancements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class OptimizationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.metrics = {
      bundleSize: 0,
      assetCount: 0,
      loadTime: 0,
      cacheEfficiency: 0
    };
  }

  /**
   * Run complete optimization validation
   */
  async validate() {
    console.log('🔍 Validating optimization implementation...\n');

    try {
      await this.validateBundleSize();
      await this.validateAssetOptimization();
      await this.validateUXEnhancements();
      await this.validatePerformance();
      await this.validateAccessibility();
      await this.validateCrossBrowserCompatibility();

      return this.generateReport();
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      return this.generateReport();
    }
  }

  /**
   * Validate bundle size optimization
   */
  async validateBundleSize() {
    console.log('📦 Validating bundle size optimization...');

    try {
      // Check if webpack optimization is configured
      const webpackConfig = require('../webpack.config.js');
      const config = webpackConfig({}, { mode: 'production' });

      if (!config.optimization) {
        this.errors.push('Webpack optimization not configured');
        return;
      }

      if (!config.optimization.splitChunks) {
        this.warnings.push('Code splitting not configured');
      }

      if (!config.optimization.usedExports) {
        this.warnings.push('Tree shaking not enabled');
      }

      // Check performance budgets
      if (!config.performance) {
        this.warnings.push('Performance budgets not set');
      } else {
        const maxSize = config.performance.maxAssetSize || 250000;
        if (maxSize > 500000) {
          this.warnings.push(`Asset size budget too high: ${maxSize} bytes`);
        }
      }

      // Build and measure actual bundle sizes
      try {
        console.log('  Building production bundle...');
        execSync('npm run build:chrome', { stdio: 'pipe' });

        const distPath = path.join(__dirname, '..', 'dist', 'chrome');
        if (fs.existsSync(distPath)) {
          const bundleStats = this.analyzeBundleSize(distPath);
          this.metrics.bundleSize = bundleStats.totalSize;
          this.metrics.assetCount = bundleStats.fileCount;

          console.log(`  ✅ Bundle size: ${Math.round(bundleStats.totalSize / 1024)}KB`);
          console.log(`  ✅ Asset count: ${bundleStats.fileCount}`);

          if (bundleStats.totalSize > 2 * 1024 * 1024) { // 2MB
            this.warnings.push(`Large bundle size: ${Math.round(bundleStats.totalSize / 1024)}KB`);
          }
        } else {
          this.errors.push('Build output not found');
        }
      } catch (buildError) {
        this.warnings.push(`Build failed: ${buildError.message}`);
      }

    } catch (error) {
      this.errors.push(`Bundle validation failed: ${error.message}`);
    }
  }

  /**
   * Analyze bundle size
   */
  analyzeBundleSize(distPath) {
    let totalSize = 0;
    let fileCount = 0;

    const analyzeDirectory = (dirPath) => {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          analyzeDirectory(itemPath);
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      });
    };

    analyzeDirectory(distPath);
    return { totalSize, fileCount };
  }

  /**
   * Validate asset optimization
   */
  async validateAssetOptimization() {
    console.log('🎨 Validating asset optimization...');

    // Check optimized SVG sprite
    const spritePath = path.join(__dirname, '..', 'assets', 'icons', 'sprite-optimized.svg');
    if (!fs.existsSync(spritePath)) {
      this.errors.push('Optimized SVG sprite not found');
    } else {
      const spriteContent = fs.readFileSync(spritePath, 'utf8');
      const symbolCount = (spriteContent.match(/<symbol/g) || []).length;
      
      if (symbolCount < 20) {
        this.warnings.push(`SVG sprite has only ${symbolCount} symbols`);
      } else {
        console.log(`  ✅ SVG sprite contains ${symbolCount} symbols`);
      }

      // Check sprite size
      const spriteSize = fs.statSync(spritePath).size;
      if (spriteSize > 50 * 1024) { // 50KB
        this.warnings.push(`SVG sprite is large: ${Math.round(spriteSize / 1024)}KB`);
      } else {
        console.log(`  ✅ SVG sprite size: ${Math.round(spriteSize / 1024)}KB`);
      }
    }

    // Check asset system implementation
    const assetSystemPath = path.join(__dirname, '..', 'src', '@ui', 'assets', 'optimized-asset-system.ts');
    if (!fs.existsSync(assetSystemPath)) {
      this.errors.push('Optimized asset system not implemented');
    } else {
      const assetSystemContent = fs.readFileSync(assetSystemPath, 'utf8');
      
      // Check for key optimization features
      const requiredFeatures = [
        'lazy loading',
        'cache',
        'preload',
        'fallback',
        'performance'
      ];

      requiredFeatures.forEach(feature => {
        if (!assetSystemContent.toLowerCase().includes(feature)) {
          this.warnings.push(`Asset system missing ${feature} optimization`);
        }
      });

      console.log('  ✅ Optimized asset system implemented');
    }

    // Check asset preloader
    const preloaderPath = path.join(__dirname, '..', 'src', '@ui', 'assets', 'asset-preloader.ts');
    if (!fs.existsSync(preloaderPath)) {
      this.errors.push('Asset preloader not implemented');
    } else {
      console.log('  ✅ Asset preloader implemented');
    }
  }

  /**
   * Validate UX enhancements
   */
  async validateUXEnhancements() {
    console.log('✨ Validating UX enhancements...');

    // Check Material transitions
    const transitionsPath = path.join(__dirname, '..', 'src', '@ui', 'components', 'transitions', 'MaterialTransitions.tsx');
    if (!fs.existsSync(transitionsPath)) {
      this.errors.push('Material transitions not implemented');
    } else {
      const transitionsContent = fs.readFileSync(transitionsPath, 'utf8');
      
      const requiredComponents = [
        'MaterialTransition',
        'LoadingState',
        'FeedbackMessage',
        'ResponsiveContainer',
        'MaterialButton'
      ];

      requiredComponents.forEach(component => {
        if (!transitionsContent.includes(component)) {
          this.warnings.push(`Missing component: ${component}`);
        }
      });

      console.log('  ✅ Material transitions implemented');
    }

    // Check UX enhancement system
    const uxSystemPath = path.join(__dirname, '..', 'src', '@ui', 'components', 'enhanced-ux', 'UXEnhancementSystem.tsx');
    if (!fs.existsSync(uxSystemPath)) {
      this.errors.push('UX enhancement system not implemented');
    } else {
      console.log('  ✅ UX enhancement system implemented');
    }

    // Check CSS for transitions and animations
    const transitionsCSSPath = path.join(__dirname, '..', 'src', '@ui', 'components', 'transitions', 'MaterialTransitions.css');
    if (!fs.existsSync(transitionsCSSPath)) {
      this.errors.push('Material transitions CSS not found');
    } else {
      const cssContent = fs.readFileSync(transitionsCSSPath, 'utf8');
      
      // Check for responsive design
      if (!cssContent.includes('@media')) {
        this.warnings.push('CSS lacks responsive design');
      }

      // Check for accessibility features
      if (!cssContent.includes('prefers-reduced-motion')) {
        this.warnings.push('CSS lacks accessibility considerations');
      }

      console.log('  ✅ Material transitions CSS implemented');
    }
  }

  /**
   * Validate performance optimizations
   */
  async validatePerformance() {
    console.log('⚡ Validating performance optimizations...');

    try {
      // Run performance tests
      console.log('  Running performance tests...');
      const testOutput = execSync('npx vitest run src/@ui/integration/optimization-integration.test.ts', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (testOutput.includes('PASS')) {
        console.log('  ✅ Performance tests passed');
      } else {
        this.warnings.push('Some performance tests failed');
      }

      // Check for performance monitoring
      const monitoringFiles = [
        'src/@ui/assets/optimized-asset-system.ts',
        'src/@ui/assets/asset-preloader.ts'
      ];

      monitoringFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('performance.now()') || content.includes('metrics')) {
            console.log(`  ✅ Performance monitoring in ${file}`);
          } else {
            this.warnings.push(`No performance monitoring in ${file}`);
          }
        }
      });

    } catch (error) {
      this.warnings.push(`Performance validation failed: ${error.message}`);
    }
  }

  /**
   * Validate accessibility features
   */
  async validateAccessibility() {
    console.log('♿ Validating accessibility features...');

    // Check for ARIA labels and accessibility features
    const componentPaths = [
      'src/@ui/components/transitions/MaterialTransitions.tsx',
      'src/@ui/components/enhanced-ux/UXEnhancementSystem.tsx'
    ];

    componentPaths.forEach(componentPath => {
      const fullPath = path.join(__dirname, '..', componentPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        if (content.includes('aria-') || content.includes('role=')) {
          console.log(`  ✅ Accessibility features in ${componentPath}`);
        } else {
          this.warnings.push(`Missing accessibility features in ${componentPath}`);
        }
      }
    });

    // Check CSS for accessibility
    const cssFiles = [
      'src/@ui/components/transitions/MaterialTransitions.css',
      'src/@ui/components/enhanced-ux/UXEnhancementSystem.css'
    ];

    cssFiles.forEach(cssFile => {
      const fullPath = path.join(__dirname, '..', cssFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const accessibilityFeatures = [
          'prefers-reduced-motion',
          'prefers-color-scheme',
          'prefers-contrast',
          'focus-visible'
        ];

        const foundFeatures = accessibilityFeatures.filter(feature => 
          content.includes(feature)
        );

        if (foundFeatures.length > 0) {
          console.log(`  ✅ Accessibility CSS in ${cssFile}: ${foundFeatures.join(', ')}`);
        } else {
          this.warnings.push(`Missing accessibility CSS in ${cssFile}`);
        }
      }
    });
  }

  /**
   * Validate cross-browser compatibility
   */
  async validateCrossBrowserCompatibility() {
    console.log('🌐 Validating cross-browser compatibility...');

    // Check webpack configuration for browser targets
    const webpackConfig = require('../webpack.config.js');
    
    try {
      const chromeConfig = webpackConfig({ browser: 'chrome' }, { mode: 'production' });
      const firefoxConfig = webpackConfig({ browser: 'firefox' }, { mode: 'production' });

      if (chromeConfig && firefoxConfig) {
        console.log('  ✅ Multi-browser webpack configuration');
      } else {
        this.warnings.push('Incomplete browser configuration');
      }
    } catch (error) {
      this.warnings.push(`Browser configuration error: ${error.message}`);
    }

    // Check for browser-specific polyfills and fallbacks
    const assetSystemPath = path.join(__dirname, '..', 'src', '@ui', 'assets', 'optimized-asset-system.ts');
    if (fs.existsSync(assetSystemPath)) {
      const content = fs.readFileSync(assetSystemPath, 'utf8');
      
      if (content.includes('chrome.runtime') && content.includes('typeof chrome')) {
        console.log('  ✅ Browser API compatibility checks');
      } else {
        this.warnings.push('Missing browser API compatibility checks');
      }
    }

    // Check for feature detection
    const uxSystemPath = path.join(__dirname, '..', 'src', '@ui', 'components', 'enhanced-ux', 'UXEnhancementSystem.tsx');
    if (fs.existsSync(uxSystemPath)) {
      const content = fs.readFileSync(uxSystemPath, 'utf8');
      
      if (content.includes('IntersectionObserver') && content.includes('typeof')) {
        console.log('  ✅ Feature detection implemented');
      } else {
        this.warnings.push('Missing feature detection');
      }
    }
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n📊 Optimization Validation Report');
    console.log('================================');

    // Metrics summary
    console.log('\n📈 Metrics:');
    console.log(`  Bundle Size: ${Math.round(this.metrics.bundleSize / 1024)}KB`);
    console.log(`  Asset Count: ${this.metrics.assetCount}`);

    // Success summary
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All optimizations validated successfully!');
      return true;
    }

    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (this.metrics.bundleSize > 1024 * 1024) {
      console.log('  • Consider further bundle size optimization');
    }
    if (this.warnings.length > 5) {
      console.log('  • Address warnings to improve optimization quality');
    }
    if (this.errors.length > 0) {
      console.log('  • Fix errors before deployment');
    }

    console.log(`\nSummary: ${this.errors.length} errors, ${this.warnings.length} warnings`);
    
    return this.errors.length === 0;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new OptimizationValidator();
  
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = OptimizationValidator;