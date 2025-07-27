cd /d "%~dp0"
npm run build
pm2 start start-server.js --name nextjs-app -- start