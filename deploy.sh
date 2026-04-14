#!/bin/bash
set -e

SERVER=${1:?"Usage: ./deploy.sh USER@HOST [all|api|web|admin|space|live]"}
CHANGED=${2:-all}
BRANCH=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
COMMIT=$(git rev-parse --short HEAD)
VERSION="${BRANCH}-${COMMIT}-SNAPSHOT"

export DOCKER_BUILDKIT=1

echo "Version: $VERSION"

build_and_send() {
  local svc=$1
  local dockerfile=$2
  local context=$3
  echo "▶ Building $svc..."
  docker buildx build --platform linux/amd64 -f "$dockerfile" -t "eventcraft-$svc:$VERSION" -t "eventcraft-$svc:latest" "$context"
  echo "▶ Sending $svc to server..."
  docker save "eventcraft-$svc:latest" | gzip | ssh "$SERVER" "docker load"
}

case $CHANGED in
  api)
    build_and_send api apps/api/Dockerfile.api apps/api/
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d api worker beat-worker"
    ;;
  web)
    build_and_send web apps/web/Dockerfile.web .
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d web"
    ;;
  admin)
    build_and_send admin apps/admin/Dockerfile.admin .
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d admin"
    ;;
  space)
    build_and_send space apps/space/Dockerfile.space .
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d space"
    ;;
  live)
    build_and_send live apps/live/Dockerfile.live .
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d live"
    ;;
  all)
    echo "▶ Building all images in parallel..."
    docker buildx build --platform linux/amd64 -f apps/api/Dockerfile.api     -t "eventcraft-api:$VERSION"   -t "eventcraft-api:latest"   apps/api/   & pid_api=$!
    docker buildx build --platform linux/amd64 -f apps/proxy/Dockerfile.ce    -t "eventcraft-proxy:$VERSION" -t "eventcraft-proxy:latest" apps/proxy/ & pid_proxy=$!
    docker buildx build --platform linux/amd64 -f apps/web/Dockerfile.web     -t "eventcraft-web:$VERSION"   -t "eventcraft-web:latest"   .           & pid_web=$!
    docker buildx build --platform linux/amd64 -f apps/admin/Dockerfile.admin -t "eventcraft-admin:$VERSION" -t "eventcraft-admin:latest" .           & pid_admin=$!
    docker buildx build --platform linux/amd64 -f apps/space/Dockerfile.space -t "eventcraft-space:$VERSION" -t "eventcraft-space:latest" .           & pid_space=$!
    docker buildx build --platform linux/amd64 -f apps/live/Dockerfile.live   -t "eventcraft-live:$VERSION"  -t "eventcraft-live:latest"  .           & pid_live=$!

    failed=()
    wait $pid_api   || failed+=(api)
    wait $pid_proxy || failed+=(proxy)
    wait $pid_web   || failed+=(web)
    wait $pid_admin || failed+=(admin)
    wait $pid_space || failed+=(space)
    wait $pid_live  || failed+=(live)

    if [ ${#failed[@]} -gt 0 ]; then
      echo "✗ Build failed for: ${failed[*]}"
      exit 1
    fi

    echo "▶ Sending images to server..."
    for svc in api proxy web admin space live; do
      docker save "eventcraft-$svc:latest" | gzip | ssh "$SERVER" "docker load"
    done

    scp docker-compose.server.yml "$SERVER:~/eventcraft/docker-compose.yml"
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d"
    ;;
  *)
    echo "Usage: ./deploy.sh USER@HOST [all|api|web|admin|space|live]"
    exit 1
    ;;
esac

echo "✓ Done! Version $VERSION → http://204.12.253.210:8074"
