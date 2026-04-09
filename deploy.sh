#!/bin/bash
set -e

SERVER=${1:?"Usage: ./deploy.sh USER@HOST [all|api|web|admin|space|live]"}
CHANGED=${2:-all}
BRANCH=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
COMMIT=$(git rev-parse --short HEAD)
VERSION="${BRANCH}-${COMMIT}-SNAPSHOT"

echo "Version: $VERSION"

build_and_send() {
  local svc=$1
  local dockerfile=$2
  local context=$3
  echo "▶ Building $svc..."
  docker build -f "$dockerfile" -t "eventcraft-$svc:$VERSION" -t "eventcraft-$svc:latest" "$context"
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
    build_and_send api   apps/api/Dockerfile.api    apps/api/
    build_and_send proxy apps/proxy/Dockerfile.ce   apps/proxy/
    build_and_send web   apps/web/Dockerfile.web    .
    build_and_send admin apps/admin/Dockerfile.admin .
    build_and_send space apps/space/Dockerfile.space .
    build_and_send live  apps/live/Dockerfile.live   .
    scp docker-compose.server.yml "$SERVER:~/eventcraft/docker-compose.yml"
    ssh "$SERVER" "cd ~/eventcraft && docker compose up -d"
    ;;
  *)
    echo "Usage: ./deploy.sh USER@HOST [all|api|web|admin|space|live]"
    exit 1
    ;;
esac

echo "✓ Done! Version $VERSION → http://204.12.253.210:8074"
