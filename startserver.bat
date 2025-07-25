cd /d "%~dp0"
pm2 delete all
pm2 start start-server.js --name nextjs-app -- start