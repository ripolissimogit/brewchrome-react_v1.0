#!/bin/bash

echo "🔍 Running FULL quality checks..."

echo "📝 Type checking..."
npm run type-check || exit 1

echo "🔧 Linting (with security)..."
npm run lint || exit 1

echo "💅 Format checking..."
npm run format:check || exit 1

echo "🧪 Running tests..."
npm run test:run || exit 1

echo "🔒 Security audit..."
npm run security || exit 1

echo "📦 Dependency check..."
npm run depcheck || exit 1

echo "🔤 Spell checking..."
npm run spell || exit 1

echo "📊 Bundle analysis..."
npm run bundle-analyze || exit 1

echo "🧹 Unused code detection..."
npm run unused || exit 1

echo "🔄 Circular dependency check..."
npm run circular || exit 1

echo "✅ ALL quality checks passed!"
echo "🚀 Ready for production deployment"
