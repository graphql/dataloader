
   
# Build before publishing
npm run build;

# When Travis CI publishes to NPM, the published files are available in the root
# directory, which produces a cleaner distribution.
#
cp dist/* .

# Ensure a vanilla package.json before deploying so other tools do not interpret
# The built output as requiring any further transformation.
node -e "var package = require('./package.json'); \
  delete package.scripts; \
  delete package.devDependencies; \
  delete package.publishConfig; \
  require('fs').writeFileSync('dist/package.json', JSON.stringify(package, null, 2));"
