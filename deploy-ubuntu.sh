#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$SCRIPT_DIR/.deploy.env}"

if [[ ! -f "$DEPLOY_ENV_FILE" ]]; then
  echo "未找到部署配置文件：$DEPLOY_ENV_FILE"
  echo "请先复制 .deploy.env.example 为 .deploy.env，并填写生产环境参数。"
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "请使用 root 或 sudo 运行本脚本。"
  exit 1
fi

source "$DEPLOY_ENV_FILE"

APP_USER="${APP_USER:-triangle}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
APP_ROOT="${APP_ROOT:-/opt/triangle}"
NODE_VERSION="${NODE_VERSION:-22}"
FRONTEND_PORT="${FRONTEND_PORT:-3004}"
BACKEND_PORT="${BACKEND_PORT:-58085}"
SIGN_SERVICE_PORT="${SIGN_SERVICE_PORT:-58086}"

DOMAIN_FRONTEND="${DOMAIN_FRONTEND:-www.sanjiaosoft.com}"
DOMAIN_API="${DOMAIN_API:-api.sanjiaosoft.com}"
DOMAIN_SIGN="${DOMAIN_SIGN:-sign.sanjiaosoft.com}"

REPO_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/Frontend"
APP_HOME="/home/$APP_USER"
SECRETS_DIR="$APP_ROOT/secrets"
LOG_DIR="$APP_ROOT/logs"
RUNTIME_DIR="$APP_ROOT/runtime"
UPLOADS_DIR="$BACKEND_DIR/uploads"
SIGN_UPLOADS_DIR="$UPLOADS_DIR/sign"
SIGN_ASSETS_UPLOADS_DIR="$UPLOADS_DIR/sign-assets"

run_as_app() {
  local command="$1"
  su - "$APP_USER" -s /bin/bash -c "export NVM_DIR='$APP_HOME/.nvm'; if [[ -s '$APP_HOME/.nvm/nvm.sh' ]]; then . '$APP_HOME/.nvm/nvm.sh'; fi; $command"
}

required_vars=(
  APP_USER
  APP_ROOT
  DOMAIN_FRONTEND
  DOMAIN_API
  DOMAIN_SIGN
  DATABASE_PROVIDER
  DATABASE_URL
  JWT_SECRET
  CORS_ORIGIN
  NEXT_PUBLIC_API_BASE_URL
  NEXT_PUBLIC_SITE_URL
  SIGN_SERVICE_TOKEN
  SIGN_PUBLIC_BASE_URL
  SIGN_ZSIGN_BIN
  SIGN_P12_PATH
  SIGN_P12_PASSWORD
  SIGN_MOBILEPROVISION_PATH
)

for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "缺少必填配置：$key"
    exit 1
  fi
done

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "当前脚本目录不是 Triangle 项目根目录：$REPO_ROOT"
  exit 1
fi

if [[ ! -x "$SIGN_ZSIGN_BIN" ]]; then
  echo "找不到可执行的 zsign：$SIGN_ZSIGN_BIN"
  exit 1
fi

if [[ ! -f "$SIGN_P12_PATH" ]]; then
  echo "找不到签名证书：$SIGN_P12_PATH"
  exit 1
fi

if [[ ! -f "$SIGN_MOBILEPROVISION_PATH" ]]; then
  echo "找不到描述文件：$SIGN_MOBILEPROVISION_PATH"
  exit 1
fi

if [[ "${OBJECT_STORAGE_DRIVER:-local}" != "local" ]]; then
  object_storage_required=(
    OBJECT_STORAGE_ENDPOINT
    OBJECT_STORAGE_BUCKET
    OBJECT_STORAGE_ACCESS_KEY_ID
    OBJECT_STORAGE_SECRET_ACCESS_KEY
    OBJECT_STORAGE_PUBLIC_BASE_URL
  )

  for key in "${object_storage_required[@]}"; do
    if [[ -z "${!key:-}" ]]; then
      echo "对象存储模式下缺少配置：$key"
      exit 1
    fi
  done
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> 安装基础依赖"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx build-essential python3 pkg-config libssl-dev curl git unzip

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  echo "==> 创建部署用户 $APP_USER"
  useradd -m -s /bin/bash "$APP_USER"
fi

mkdir -p "$APP_ROOT" "$SECRETS_DIR" "$LOG_DIR" "$RUNTIME_DIR"
chown -R "$APP_USER:$APP_GROUP" "$APP_ROOT"
chown -R "$APP_USER:$APP_GROUP" "$REPO_ROOT"

echo "==> 初始化本地上传目录"
mkdir -p "$UPLOADS_DIR" "$SIGN_UPLOADS_DIR" "$SIGN_ASSETS_UPLOADS_DIR"
chown -R "$APP_USER:$APP_GROUP" "$UPLOADS_DIR"

if ! run_as_app "command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1"; then
  if [[ -s "$APP_HOME/.nvm/nvm.sh" ]]; then
    echo "==> 检测到 nvm，补装 Node.js $NODE_VERSION"
    run_as_app "nvm install $NODE_VERSION && nvm alias default $NODE_VERSION && nvm use $NODE_VERSION"
  else
    echo "未检测到 $APP_USER 用户下可用的 node/npm，也没有找到 $APP_HOME/.nvm/nvm.sh"
    echo "请先为部署用户安装 Node.js，再重新运行脚本。"
    exit 1
  fi
fi

if ! run_as_app "command -v pm2 >/dev/null 2>&1"; then
  echo "==> 安装 PM2"
  run_as_app "npm install -g pm2"
fi

PM2_BIN="$(run_as_app "command -v pm2")"
if [[ -z "$PM2_BIN" ]]; then
  echo "PM2 安装后仍未找到可执行路径"
  exit 1
fi

echo "==> 写入后端环境变量"
cat > "$BACKEND_DIR/.env" <<EOF
PORT=$BACKEND_PORT
DATABASE_PROVIDER=$DATABASE_PROVIDER
DATABASE_TARGET=${DATABASE_TARGET:-production}
DATABASE_URL="$DATABASE_URL"
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
CORS_ORIGIN=$CORS_ORIGIN
PUBLIC_SITE_URL=https://$DOMAIN_FRONTEND
SIGN_P12_PATH=$SIGN_P12_PATH
SIGN_P12_PASSWORD=$SIGN_P12_PASSWORD
SIGN_MOBILEPROVISION_PATH=$SIGN_MOBILEPROVISION_PATH
SIGN_PUBLIC_BASE_URL=$SIGN_PUBLIC_BASE_URL
SIGN_ZSIGN_BIN=$SIGN_ZSIGN_BIN
SIGN_SERVICE_URL=${SIGN_SERVICE_URL:-https://$DOMAIN_SIGN}
SIGN_SERVICE_TOKEN=$SIGN_SERVICE_TOKEN
SIGN_SERVICE_PORT=$SIGN_SERVICE_PORT
SIGN_TIMEOUT_MS=${SIGN_TIMEOUT_MS:-600000}
SIGN_MAX_IPA_BYTES=${SIGN_MAX_IPA_BYTES:-1073741824}
SIGN_BUNDLE_IDENTIFIER=${SIGN_BUNDLE_IDENTIFIER:-com.triangle.signed}
SIGN_BUNDLE_VERSION=${SIGN_BUNDLE_VERSION:-1.0.0}
BAIDU_PUSH_ENABLED=${BAIDU_PUSH_ENABLED:-false}
BAIDU_PUSH_SITE=${BAIDU_PUSH_SITE:-https://$DOMAIN_FRONTEND}
BAIDU_PUSH_TOKEN=${BAIDU_PUSH_TOKEN:-}
BAIDU_PUSH_ENDPOINT=${BAIDU_PUSH_ENDPOINT:-http://data.zz.baidu.com/urls}
BAIDU_PUSH_TIMEOUT_MS=${BAIDU_PUSH_TIMEOUT_MS:-5000}
OBJECT_STORAGE_DRIVER=${OBJECT_STORAGE_DRIVER:-local}
OBJECT_STORAGE_ENDPOINT=${OBJECT_STORAGE_ENDPOINT:-}
OBJECT_STORAGE_REGION=${OBJECT_STORAGE_REGION:-auto}
OBJECT_STORAGE_BUCKET=${OBJECT_STORAGE_BUCKET:-}
OBJECT_STORAGE_ACCESS_KEY_ID=${OBJECT_STORAGE_ACCESS_KEY_ID:-}
OBJECT_STORAGE_SECRET_ACCESS_KEY=${OBJECT_STORAGE_SECRET_ACCESS_KEY:-}
OBJECT_STORAGE_FORCE_PATH_STYLE=${OBJECT_STORAGE_FORCE_PATH_STYLE:-true}
OBJECT_STORAGE_PUBLIC_BASE_URL=${OBJECT_STORAGE_PUBLIC_BASE_URL:-}
EOF

echo "==> 写入前端环境变量"
cat > "$FRONTEND_DIR/.env.local" <<EOF
NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL:-http://127.0.0.1:$BACKEND_PORT}
EOF

echo "==> 安装后端依赖"
run_as_app "cd '$BACKEND_DIR' && npm ci"

echo "==> 安装前端依赖"
run_as_app "cd '$FRONTEND_DIR' && npm ci"

echo "==> 生成 Prisma Client"
run_as_app "cd '$BACKEND_DIR' && npx prisma generate"
run_as_app "cd '$BACKEND_DIR' && npx prisma generate --schema prisma/schema.postgresql.prisma"

echo "==> 构建前端"
run_as_app "cd '$FRONTEND_DIR' && npm run build"

echo "==> 启动 PM2 进程"
run_as_app "pm2 delete triangle-frontend >/dev/null 2>&1 || true"
run_as_app "pm2 delete triangle-backend >/dev/null 2>&1 || true"
run_as_app "pm2 delete triangle-sign-service >/dev/null 2>&1 || true"

run_as_app "cd '$FRONTEND_DIR' && pm2 start npm --name triangle-frontend -- start"
run_as_app "cd '$BACKEND_DIR' && pm2 start npm --name triangle-backend -- start"
run_as_app "cd '$BACKEND_DIR' && pm2 start npm --name triangle-sign-service -- run sign-service"
run_as_app "pm2 save"

"$PM2_BIN" startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null || true

echo "==> 写入 Nginx 配置"
cat > /etc/nginx/sites-available/triangle.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN_FRONTEND;

    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name $DOMAIN_API;

    client_max_body_size 2g;

    location / {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name $DOMAIN_SIGN;

    client_max_body_size 256m;

    location / {
        proxy_pass http://127.0.0.1:$SIGN_SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf /etc/nginx/sites-available/triangle.conf /etc/nginx/sites-enabled/triangle.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> 健康检查"
sleep 5
curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null
curl -fsS "http://127.0.0.1:$SIGN_SERVICE_PORT/health" >/dev/null
curl -fsS "http://127.0.0.1:$FRONTEND_PORT" >/dev/null

if [[ "${ENABLE_CERTBOT:-false}" == "true" ]]; then
  if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
    echo "ENABLE_CERTBOT=true 但 LETSENCRYPT_EMAIL 未填写"
    exit 1
  fi

  echo "==> 申请 Let's Encrypt 证书"
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$LETSENCRYPT_EMAIL" \
    -d "$DOMAIN_FRONTEND" \
    -d "$DOMAIN_API" \
    -d "$DOMAIN_SIGN"
fi

echo
echo "部署完成。"
echo "前端: https://$DOMAIN_FRONTEND"
echo "API: https://$DOMAIN_API"
echo "签名服务: https://$DOMAIN_SIGN"
echo
echo "常用检查命令："
echo "  pm2 status"
echo "  pm2 logs triangle-backend"
echo "  pm2 logs triangle-sign-service"
echo "  systemctl status nginx"
echo
echo "如果你还没配 HTTPS，可以先确认 DNS 解析无误后，把 .deploy.env 里的 ENABLE_CERTBOT 改成 true 再重跑一遍。"
