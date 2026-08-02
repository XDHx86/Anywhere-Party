#!/usr/bin/env node

/**
 * Asset Validation Script
 * Validates all asset paths during build process
 */

const fs = require('fs');
const path = require('path');

class AssetValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.assetsDir = path.join(__dirname, '..', 'assets');
    this.manifestPath = path.join(this.assetsDir, 'asset-manifest.json');
  }

  /**
   * Validate all assets
   */
  async validate() {
    console.log('🔍 Validating assets...');
    
    try {
      // Check if assets directory exists
      if (!fs.existsSync(this.assetsDir)) {
        this.errors.push('Assets directory does not exist');
        return this.report();
      }

      // Check if asset manifest exists
      if (!fs.existsSync(this.manifestPath)) {
        this.errors.push('Asset manifest does not exist');
        return this.report();
      }

      // Load and validate manifest
      const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
      await this.validateManifest(manifest);

      // Validate critical assets
      await this.validateCriticalAssets();

      // Validate font assets
      await this.validateFontAssets();

      // Validate SVG sprite
      await this.validateSVGSprite();

      return this.report();
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      return this.report();
    }
  }

  /**
   * Validate asset manifest
   */
  async validateManifest(manifest) {
    if (!manifest.assets) {
      this.errors.push('Manifest missing assets section');
      return;
    }

    // Validate each asset category
    for (const [categoryName, category] of Object.entries(manifest.assets)) {
      if (typeof category !== 'object') continue;

      for (const [assetName, asset] of Object.entries(category)) {
        if (asset.path) {
          const assetPath = path.join(this.assetsDir, asset.path);
          if (!fs.existsSync(assetPath)) {
            this.errors.push(`Missing asset: ${asset.path} (${categoryName}.${assetName})`);
          } else {
            // Check file size for optimization
            const stats = fs.statSync(assetPath);
            if (stats.size > 100 * 1024) { // 100KB
              this.warnings.push(`Large asset: ${asset.path} (${Math.round(stats.size / 1024)}KB)`);
            }
          }
        }
      }
    }
  }

  /**
   * Validate critical assets
   */
  async validateCriticalAssets() {
    const criticalAssets = [
      'icons/sprite.svg',
      'fonts/fontawesome/css/all.min.css',
      'fonts/fontawesome/webfonts/fa-solid-900.woff2',
      'fonts/fontawesome/webfonts/fa-regular-400.woff2',
      'fonts/fontawesome/webfonts/fa-brands-400.woff2'
    ];

    for (const assetPath of criticalAssets) {
      const fullPath = path.join(this.assetsDir, assetPath);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing critical asset: ${assetPath}`);
      }
    }
  }

  /**
   * Validate font assets
   */
  async validateFontAssets() {
    const fontDir = path.join(this.assetsDir, 'fonts', 'fontawesome');
    
    if (!fs.existsSync(fontDir)) {
      this.errors.push('Font Awesome directory missing');
      return;
    }

    // Check CSS file
    const cssFile = path.join(fontDir, 'css', 'all.min.css');
    if (!fs.existsSync(cssFile)) {
      this.errors.push('Font Awesome CSS file missing');
    } else {
      // Validate CSS content
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      if (!cssContent.includes('@font-face')) {
        this.warnings.push('Font Awesome CSS may be incomplete (no @font-face declarations)');
      }
    }

    // Check font files
    const webfontsDir = path.join(fontDir, 'webfonts');
    if (!fs.existsSync(webfontsDir)) {
      this.errors.push('Font Awesome webfonts directory missing');
    }
  }

  /**
   * Validate SVG sprite
   */
  async validateSVGSprite() {
    const spritePath = path.join(this.assetsDir, 'icons', 'sprite.svg');
    
    if (!fs.existsSync(spritePath)) {
      this.errors.push('SVG sprite file missing');
      return;
    }

    // Validate SVG content
    const spriteContent = fs.readFileSync(spritePath, 'utf8');
    
    if (!spriteContent.includes('<symbol')) {
      this.errors.push('SVG sprite appears to be empty or invalid');
    }

    // Count symbols
    const symbolCount = (spriteContent.match(/<symbol/g) || []).length;
    if (symbolCount < 20) {
      this.warnings.push(`SVG sprite has only ${symbolCount} symbols (expected at least 20)`);
    }

    console.log(`✅ SVG sprite contains ${symbolCount} symbols`);
  }

  /**
   * Create missing placeholder assets
   */
  createPlaceholders() {
    console.log('🔧 Creating placeholder assets...');

    // Create directories
    const dirs = [
      'fonts/fontawesome/css',
      'fonts/fontawesome/webfonts',
      'icons',
      'logo/main',
      'logo/light-theme',
      'logo/dark-theme'
    ];

    dirs.forEach(dir => {
      const fullDir = path.join(this.assetsDir, dir);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    // Create placeholder SVG icons if missing
    const placeholderSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect width="24" height="24" fill="#6200EE" opacity="0.1"/>
      <text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="8">?</text>
    </svg>`;

    // Create missing icon files
    const iconCategories = ['toolbar', 'popup', 'reactions', 'ui'];
    iconCategories.forEach(category => {
      const categoryDir = path.join(this.assetsDir, 'icons', category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
    });
  }

  /**
   * Generate validation report
   */
  report() {
    console.log('\n📊 Asset Validation Report');
    console.log('========================');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All assets validated successfully!');
      return true;
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    console.log(`\nSummary: ${this.errors.length} errors, ${this.warnings.length} warnings`);
    
    return this.errors.length === 0;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new AssetValidator();
  
  validator.validate().then(success => {
    if (!success) {
      console.log('\n🔧 Creating missing assets...');
      validator.createPlaceholders();
      process.exit(1);
    }
    process.exit(0);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = AssetValidator;