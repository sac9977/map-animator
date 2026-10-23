#!/bin/bash
# Helper script to link and push MapAnimator to GitHub
set -e

if [ -z "$1" ]; then
  echo "Usage: ./push-to-github.sh <github-repo-url>"
  echo "Example: ./push-to-github.sh https://github.com/your-username/mapanimator-studio.git"
  echo "   or:   ./push-to-github.sh git@github.com:your-username/mapanimator-studio.git"
  exit 1
fi

REPO_URL="$1"

# Check if origin already exists
if git remote | grep -q "^origin$"; then
  echo "Updating existing remote origin to: $REPO_URL"
  git remote set-url origin "$REPO_URL"
else
  echo "Adding remote origin: $REPO_URL"
  git remote add origin "$REPO_URL"
fi

echo "Current branch: $(git branch --show-current)"
echo "Pushing main branch to $REPO_URL..."
git push -u origin main

echo "Successfully pushed MapAnimator to GitHub!"
