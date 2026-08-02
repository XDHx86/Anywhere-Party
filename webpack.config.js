const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// Asset validation helper
const validateAssets = () => {
  try {
    const AssetValidator = require('./scripts/validate-assets');
    const validator = new AssetValidator();
    
    // Run synchronous validation
    const assetManifest = require('./assets/asset-manifest.json');
    const missingAssets = [];
    
    // Validate all assets exist
    Object.values(assetManifest.assets).forEach(category => {
      Object.values(category).forEach(asset => {
        if (asset.path) {
          const fullPath = path.join(__dirname, 'assets', asset.path);
          if (!fs.existsSync(fullPath)) {
            missingAssets.push(asset.path);
          }
        }
      });
    });
    
    // Check critical assets
    const criticalAssets = [
      'icons/sprite.svg',
      'fonts/fontawesome/css/all.min.css'
    ];
    
    criticalAssets.forEach(assetPath => {
      const fullPath = path.join(__dirname, 'assets', assetPath);
      if (!fs.existsSync(fullPath)) {
        missingAssets.push(assetPath);
      }
    });
    
    if (missingAssets.length > 0) {
      console.warn('Missing assets detected:', missingAssets);
      // Create placeholder assets for missing ones
      missingAssets.forEach(assetPath => {
        const fullPath = path.join(__dirname, 'assets', assetPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Create appropriate placeholder based on file type
        if (assetPath.endsWith('.svg')) {
          const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect width="24" height="24" fill="#6200EE" opacity="0.1"/><text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="8">?</text></svg>`;
          fs.writeFileSync(fullPath, placeholder);
        } else if (assetPath.endsWith('.css')) {
          const placeholder = `/* Placeholder CSS file for ${assetPath} */\n.placeholder { display: none; }`;
          fs.writeFileSync(fullPath, placeholder);
        } else {
          const placeholder = `# Placeholder file for ${assetPath}`;
          fs.writeFileSync(fullPath, placeholder);
        }
      });
    }
    
    return missingAssets.length === 0;
  } catch (error) {
    console.warn('Asset validation failed:', error.message);
    return false;
  }
};

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const browser = env?.browser || 'chrome'; // Default to chrome if not specified
  
  const baseConfig = {
    entry: {
      background: './src/background.ts',
      'content-script': './src/content-script.ts',
      'popup-react': './src/@ui/popup/popup-react.tsx',
      'options-react': './src/@ui/options/options-react.tsx',
      'popup-fallback': './src/@ui/popup/popup-fallback.ts',
      'options-fallback': './src/@ui/options/options-fallback.ts'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.build.json',
              transpileOnly: true
            }
          },
          exclude: [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/]
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: false
              }
            },
            'postcss-loader'
          ]
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash:8][ext]'
          },
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // 8KB - inline small images
            }
          }
        },
        {
          test: /\.svg$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/icons/[name].[hash:8][ext]'
          },
          parser: {
            dataUrlCondition: {
              maxSize: 4 * 1024 // 4KB - inline small SVGs
            }
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash:8][ext]'
          }
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@core': path.resolve(__dirname, 'src/@core'),
        '@ui': path.resolve(__dirname, 'src/@ui')
      }
    },
    devtool: isProduction ? false : 'source-map',
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true
          },
          ui: {
            test: /[\\/]src[\\/]@ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 8
          },
          core: {
            test: /[\\/]src[\\/]@core[\\/]/,
            name: 'core-modules',
            chunks: 'all',
            priority: 7
          }
        }
      },
      usedExports: true,
      sideEffects: false
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 250000, // 250KB
      maxAssetSize: 250000 // 250KB
    }
  };

  // Validate assets before build
  validateAssets();

  // Browser-specific configurations
  if (browser === 'firefox') {
    return {
      ...baseConfig,
      output: {
        path: path.resolve(__dirname, 'dist/firefox'),
        filename: '[name].js',
        clean: true
      },
      plugins: [
        new CopyWebpackPlugin({
          patterns: [
            { from: 'manifest-firefox.json', to: 'manifest.json' },
            { from: 'extension-config.json', to: 'extension-config.json' },
            { from: 'src/@ui/popup/popup-react.html', to: 'popup.html' },
            { from: 'src/@ui/options/options-react.html', to: 'options.html' },
            { from: 'assets', to: 'assets', noErrorOnMissing: true },
            { from: 'assets/fonts', to: 'assets/fonts', noErrorOnMissing: true },
            { from: 'assets/icons/sprite.svg', to: 'assets/icons/sprite.svg', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-16.svg', to: 'icons/icon-16.png', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-32.svg', to: 'icons/icon-32.png', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-48.svg', to: 'icons/icon-48.png', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-48.svg', to: 'icons/icon-128.png', noErrorOnMissing: true }
          ]
        })
      ]
    };
  } else {
    // Chrome (default)
    return {
      ...baseConfig,
      output: {
        path: path.resolve(__dirname, 'dist/chrome'),
        filename: '[name].js',
        clean: true
      },
      plugins: [
        new CopyWebpackPlugin({
          patterns: [
            { from: 'manifest-chrome.json', to: 'manifest.json' },
            { from: 'extension-config.json', to: 'extension-config.json' },
            { from: 'src/@ui/popup/popup-react.html', to: 'popup.html' },
            { from: 'src/@ui/options/options-react.html', to: 'options.html' },
            { from: 'assets', to: 'assets', noErrorOnMissing: true },
            { from: 'assets/fonts', to: 'assets/fonts', noErrorOnMissing: true },
            { from: 'assets/icons/sprite.svg', to: 'assets/icons/sprite.svg', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-16.svg', to: 'icons/icon-16.png', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-32.svg', to: 'icons/icon-32.png', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-48.svg', to: 'icons/icon-48.png', noErrorOnMissing: true },
            { from: 'assets/icons/toolbar/icon-48.svg', to: 'icons/icon-128.png', noErrorOnMissing: true }
          ]
        })
      ]
    };
  }
};