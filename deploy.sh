#!/bin/bash
# ============================================================
# deploy.sh — Build di local, push ke Docker Hub, deploy ke VPS
# ============================================================
#
# Cara pakai:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prasyarat:
#   1. Docker Desktop sudah running di local
#   2. Sudah login Docker Hub: docker login
#   3. VPS sudah di-setup (jalankan setup-vps.sh dulu)
#   4. SSH key sudah di-copy ke VPS
#
# ============================================================

set -e

# ── KONFIGURASI (GANTI SESUAI KEBUTUHAN) ──────────────────
DOCKER_USER="baratrahjaga"                      # Docker Hub username
IMAGE_NAME="blockmaps-saas"                     # Nama image
VPS_HOST="159.223.55.33"                        # IP VPS
VPS_USER="root"                                 # SSH user
VPS_APP_DIR="/opt/blockmaps"                    # Directory app di VPS
TAG="${1:-latest}"                               # Tag, default: latest
FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${TAG}"

echo ""
echo "============================================"
echo "  blockmaps-SaaS — Deploy Pipeline"
echo "============================================"
echo "  Image : ${FULL_IMAGE}"
echo "  VPS   : ${VPS_USER}@${VPS_HOST}"
echo "  Dir   : ${VPS_APP_DIR}"
echo "============================================"
echo ""

# ── STEP 1: Build image di local ──────────────────────────
echo ">> [1/4] Building Docker image locally..."
docker build \
  --build-arg SKIP_ENV_VALIDATION=1 \
  --build-arg DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
  --build-arg DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
  --build-arg AUTH_SECRET="build-time-placeholder" \
  --build-arg GOOGLE_CLIENT_ID="placeholder" \
  --build-arg GOOGLE_CLIENT_SECRET="placeholder" \
  --build-arg NEXTAUTH_URL="http://localhost:3000" \
  --build-arg BASE_URL="http://localhost:3000" \
  --build-arg MIDTRANS_SERVER_KEY="placeholder" \
  --build-arg MIDTRANS_CLIENT_KEY="placeholder" \
  --build-arg MIDTRANS_ENV="sandbox" \
  --build-arg NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="placeholder" \
  -t "${FULL_IMAGE}" \
  -t "${DOCKER_USER}/${IMAGE_NAME}:latest" \
  .

echo ">> Build selesai!"
echo ""

# ── STEP 2: Push ke Docker Hub ────────────────────────────
echo ">> [2/4] Pushing image ke Docker Hub..."
docker push "${FULL_IMAGE}"
if [ "${TAG}" != "latest" ]; then
  docker push "${DOCKER_USER}/${IMAGE_NAME}:latest"
fi
echo ">> Push selesai!"
echo ""

# ── STEP 3: Copy compose files ke VPS (jika belum ada) ───
echo ">> [3/4] Syncing config files ke VPS..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_APP_DIR}"

# Copy docker-compose files
scp docker-compose.yml ${VPS_USER}@${VPS_HOST}:${VPS_APP_DIR}/
scp docker-compose.prod.yml ${VPS_USER}@${VPS_HOST}:${VPS_APP_DIR}/

# Copy .env HANYA jika belum ada di VPS (jangan overwrite production env!)
ssh ${VPS_USER}@${VPS_HOST} "
  if [ ! -f ${VPS_APP_DIR}/.env ]; then
    echo '>> .env belum ada di VPS, silakan buat manual dari .env.production.example'
  else
    echo '>> .env sudah ada, skip.'
  fi
"

echo ""

# ── STEP 4: Deploy di VPS ────────────────────────────────
echo ">> [4/4] Deploying di VPS..."
ssh ${VPS_USER}@${VPS_HOST} "
  cd ${VPS_APP_DIR}

  # Set image name di env
  export DOCKER_IMAGE=${FULL_IMAGE}

  # Pull image terbaru
  echo '>> Pulling image...'
  docker pull ${FULL_IMAGE}

  # Restart services
  echo '>> Starting services...'
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

  # Show status
  echo ''
  echo '>> Container status:'
  docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

  echo ''
  echo '>> Logs (last 20 lines):'
  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=20 app
"

echo ""
echo "============================================"
echo "  ✅ Deploy selesai!"
echo "  App: http://${VPS_HOST}:3000"
echo "============================================"
