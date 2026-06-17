// PM2 process config for Deploy.sa (production).
// Usage:  pm2 start ecosystem.config.js  &&  pm2 save
module.exports = {
  apps: [
    {
      name: "deploy-sa",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/deploy-sa",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "512M",
    },
  ],
};
