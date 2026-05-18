#!/bin/bash
# OpenEncoder Release Script
# Usage: ./scripts/release.sh 0.2.0

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/release.sh <version>"
    echo "Example: ./scripts/release.sh 0.2.0"
    exit 1
fi

# Validate version format (semver)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version format. Use semantic versioning (e.g., 0.2.0)"
    exit 1
fi

TAG="v${VERSION}"

echo "📦 Preparing release: $TAG"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "❌ Error: Tag $TAG already exists"
    exit 1
fi

# Verify working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Working directory has uncommitted changes"
    echo "   Please commit or stash changes before releasing"
    exit 1
fi

# Ask for confirmation
read -p "Ready to release $TAG. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

echo ""
echo "✅ Verifying build locally..."
npm run lint > /dev/null || { echo "❌ Linting failed"; exit 1; }
npm run test > /dev/null || { echo "❌ Tests failed"; exit 1; }
npm run build > /dev/null || { echo "❌ Build failed"; exit 1; }

echo "✅ All checks passed"
echo ""
echo "📝 Creating tag and pushing to GitHub..."

# Update package.json version
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
rm package.json.bak

# Stage and commit version bump
git add package.json
git commit -m "chore: release $TAG" --allow-empty

# Create tag
git tag "$TAG" -m "Release $TAG"

# Push to GitHub
git push origin main
git push origin "$TAG"

echo ""
echo "✅ Release pushed! GitHub Actions will now:"
echo "   1. Run tests"
echo "   2. Build installers for Windows, macOS, Linux"
echo "   3. Create GitHub release with artifacts"
echo ""
echo "👉 Monitor progress at:"
echo "   https://github.com/user/openencoder/actions"
echo ""
echo "📦 Release will be available at:"
echo "   https://github.com/user/openencoder/releases/tag/$TAG"
