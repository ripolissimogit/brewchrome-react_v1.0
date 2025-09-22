#!/bin/bash

echo "🔍 Running quality checks..."

echo "📝 Type checking..."
npm run type-check || exit 1

echo "🔧 Linting..."
npm run lint || exit 1

echo "💅 Format checking..."
npm run format:check || exit 1

echo "🧪 Running tests..."
npm run test:run || exit 1

echo "🔒 Security audit..."
npm audit --audit-level=moderate || exit 1

echo "📦 Dependency check..."
npm run depcheck || exit 1

echo "✅ All quality checks passed!"
echo "🚀 Ready for deployment"
