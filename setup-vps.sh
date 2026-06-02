#!/bin/bash
# ============================================================
# setup-vps.sh — Setup awal VPS (jalankan SEKALI saja)
# ============================================================
#
# Cara pakai:
#   1. SSH ke VPS: ssh root@159.223.55.33
#   2. Copy-paste script ini, atau:
#      scp setup-vps.sh root@159.223.55.33:/root/
#      ssh root@159.223.55.33 "chmod +x /root/setup-vps.sh && /root/setup-vps.sh"
#
# ============================================================

set -e

APP_DIR="/opt/blockmaps"

echo ""
echo "============================================"
echo "  VPS Setup — blockmaps-SaaS"
echo "============================================"
echo ""

# ── 1. Update system ──────────────────────────────────────
echo ">> [1/5] Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Docker ─────────────────────────────────────
echo ">> [2/5] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo ">> Docker installed."
else
  echo ">> Docker already installed, skipping."
fi

# Verify Docker Compose (included in Docker Engine 24+)
docker compose version

# ── 3. Setup firewall ─────────────────────────────────────
echo ">> [3/5] Configuring firewall (UFW)..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw allow 3000/tcp   # Next.js (hapus setelah setup Nginx)
ufw --force enable
echo ">> Firewall configured."

# ── 4. Create app directory ───────────────────────────────
echo ">> [4/5] Creating app directory..."
mkdir -p ${APP_DIR}
echo ">> Directory ${APP_DIR} created."

# ── 5. Instruksi selanjutnya ──────────────────────────────
echo ""
echo "============================================"
echo "  ✅ VPS Setup selesai!"
echo "============================================"
echo ""
echo "  Langkah selanjutnya:"
echo ""
echo "  1. Login Docker Hub di VPS:"
echo "     docker login"
echo ""
echo "  2. Buat file .env di ${APP_DIR}:"
echo "     nano ${APP_DIR}/.env"
echo "     (isi dari .env.production.example)"
echo ""
echo "  3. Jalankan deploy.sh dari laptop:"
echo "     ./deploy.sh"
echo ""
echo "============================================"
