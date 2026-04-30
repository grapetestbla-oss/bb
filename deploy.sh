#!/bin/bash
# ============================================================
# BrawlBoost - VPS Deployment Script
# ============================================================
# Usage: bash deploy.sh [DOMAIN]
# Example: bash deploy.sh brawlboost.ru
# If no domain, the site will be available on IP:80
# ============================================================

set -e

DOMAIN=${1:-}
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  BrawlBoost Deploy Script  ${NC}"
echo -e "${GREEN}================================${NC}"

# ---- 1. System Update ----
echo -e "${YELLOW}[1/8] Updating system...${NC}"
sudo apt-get update && sudo apt-get upgrade -y

# ---- 2. Install Docker ----
echo -e "${YELLOW}[2/8] Installing Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed!${NC}"
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

# ---- 3. Install Bun (for local dev if needed) ----
echo -e "${YELLOW}[3/8] Installing Bun runtime...${NC}"
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo -e "${GREEN}Bun installed!${NC}"
else
    echo -e "${GREEN}Bun already installed.${NC}"
fi

# ---- 4. Create .env if not exists ----
echo -e "${YELLOW}[4/8] Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    # Generate a random secret
    RANDOM_SECRET=$(openssl rand -base64 32)
    sed -i "s/change-this-to-a-random-string-at-least-32-chars/$RANDOM_SECRET/" .env
    if [ -n "$DOMAIN" ]; then
        sed -i "s|http://localhost:3000|https://$DOMAIN|" .env
    fi
    echo -e "${GREEN}.env file created with random secret!${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# ---- 5. Update Caddy config for domain ----
echo -e "${YELLOW}[5/8] Configuring reverse proxy...${NC}"
if [ -n "$DOMAIN" ]; then
    sed -i "s/YOUR_DOMAIN/$DOMAIN/" Caddyfile.prod
    echo -e "${GREEN}Caddy configured for domain: $DOMAIN (auto HTTPS)${NC}"
else
    # Use HTTP-only config for IP access
    cat > Caddyfile.prod << 'EOF'
:80 {
    @chat_query query XTransformPort=*
    handle @chat_query {
        reverse_proxy chat-service:3003 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
    handle {
        reverse_proxy app:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
EOF
    echo -e "${GREEN}Caddy configured for IP access (HTTP only)${NC}"
fi

# ---- 6. Build and start containers ----
echo -e "${YELLOW}[6/8] Building Docker containers...${NC}"
sudo docker compose build

echo -e "${YELLOW}[7/8] Starting services...${NC}"
sudo docker compose up -d

# ---- 7. Wait for app to start and seed DB ----
echo -e "${YELLOW}[8/8] Seeding database...${NC}"
sleep 10

# Try to seed the database
SEED_URL="http://localhost:3000/api/seed"
for i in {1..5}; do
    if curl -s -X POST "$SEED_URL" | grep -q "успешно"; then
        echo -e "${GREEN}Database seeded successfully!${NC}"
        break
    fi
    echo "Waiting for app to start... (attempt $i/5)"
    sleep 5
done

# ---- Done! ----
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  🎮 BrawlBoost is LIVE!  ${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
if [ -n "$DOMAIN" ]; then
    echo -e "🌐 URL: ${GREEN}https://$DOMAIN${NC}"
else
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    echo -e "🌐 URL: ${GREEN}http://$SERVER_IP${NC}"
fi
echo ""
echo -e "👤 Admin credentials:"
echo -e "   Email:    ${YELLOW}admin@brawlboost.ru${NC}"
echo -e "   Username: ${YELLOW}denA34934${NC}"
echo -e "   Password: ${YELLOW}denA34934${NC}"
echo ""
echo -e "🔧 Useful commands:"
echo -e "   View logs:       ${YELLOW}sudo docker compose logs -f${NC}"
echo -e "   Restart:         ${YELLOW}sudo docker compose restart${NC}"
echo -e "   Stop:            ${YELLOW}sudo docker compose down${NC}"
echo -e "   Rebuild & start: ${YELLOW}sudo docker compose up -d --build${NC}"
echo -e "   Reseed DB:       ${YELLOW}curl -X POST http://localhost:3000/api/seed${NC}"
echo ""
