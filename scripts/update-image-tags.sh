#!/usr/bin/env bash
set -euo pipefail

# Usage: update-image-tags.sh <service> <image> <tag>
SERVICE=${1:-}
IMAGE=${2:-}
TAG=${3:-}

if [ -z "$SERVICE" ] || [ -z "$IMAGE" ] || [ -z "$TAG" ]; then
  echo "Usage: $0 <service> <image> <tag>"
  exit 2
fi

FULL_IMAGE="$IMAGE:$TAG"

echo "Updating manifests for $SERVICE -> $FULL_IMAGE"

# Update k8s deployments
find infra/k8s -type f -name "deployment.yaml" -print0 | while IFS= read -r -d '' file; do
  if grep -q "name: $SERVICE" "$file" || grep -q "app: $SERVICE" "$file"; then
    echo " - patching $file"
    sed -i.bak -E "s#image: .*#image: $FULL_IMAGE#g" "$file"
    rm -f "$file.bak"
  fi
done

# Update Helm values
for values in infra/helm/$SERVICE/values.yaml; do
  if [ -f "$values" ]; then
    echo " - patching $values"
    sed -i.bak -E "s#(^\s*repository:\s*).*$#\1$IMAGE#g" "$values" || true
    sed -i.bak -E "s#(^\s*tag:\s*).*$#\1$TAG#g" "$values" || true
    rm -f "$values.bak"
  fi
done

git add -A infra/
git commit -m "chore: update $SERVICE image -> $FULL_IMAGE" || echo "no changes to commit"
git push origin HEAD
