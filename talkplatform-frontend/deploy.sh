# run this first to setup
#pm2 deploy ecosystem.config.js production setup 

set -e

read -p "Enter DEV | PROD: " env

if [ $env == 'DEV' ]; then
    echo "Deploying DEV"
    HOST=159.223.63.199
    ENV_FILE=.env.dev
    # DOMAIN=https://ideoglow.com
    PM2_DEPLOY=development
fi

# if [ $env == 'PROD' ]; then
# fi

PRJ_DIR=/root/workspace/free-talk/talkplatform-frontend

# nạp biến từ file .env
if [ -f .env ]; then
  # export toàn bộ biến trong file .env
  export $(grep -v '^#' .env | xargs)
fi

# check biến NEXT_PUBLIC_ENV
if [[ "$NEXT_PUBLIC_ENV" == *"LOCAL"* ]]; then
  echo "❌ NEXT_PUBLIC_ENV chứa 'localhost' → Không deploy"
  exit 1
fi

yarn install
yarn build

./push.sh "deploy `date +%Y-%m-%d-%H:%M:%S`"

echo "Creating build archive..."
tar -czf next-build.tar.gz .next public

echo "Uploading files to server..."
scp next-build.tar.gz root@$HOST:$PRJ_DIR/
scp $ENV_FILE root@$HOST:$PRJ_DIR/.env

# Clean up local archive
rm -f next-build.tar.gz

echo "Deploying on server"
ssh root@$HOST << EOF
cd $PRJ_DIR

echo "Extracting build files..."
rm -rf .next public
tar -xzf next-build.tar.gz
rm -f next-build.tar.gz

echo "Pulling latest source code..."
git reset --hard origin/main
git pull

echo "Installing dependencies..."
yarn install --frozen-lockfile

echo "Setting permissions..."
chmod -R 755 .next public

echo "Restarting with PM2..."
# start or restart
pm2 restart talkplatform-frontend || pm2 start "yarn start" --name "talkplatform-frontend"
EOF

sleep 3

curl $DOMAIN
