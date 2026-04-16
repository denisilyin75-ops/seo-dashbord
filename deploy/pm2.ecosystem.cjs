// PM2 ecosystem file. Запуск: pm2 start deploy/pm2.ecosystem.cjs --env production
// Сохранение: pm2 save && pm2 startup
//
// Расширение .cjs обязательно потому что package.json имеет "type": "module"

module.exports = {
  apps: [
    {
      name: 'scc-api',
      script: 'server/index.js',
      cwd: '/var/www/seo-command-center',
      instances: 1, // SQLite + cron — только один процесс
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
      },
      out_file: '/var/log/pm2/scc-api.out.log',
      error_file: '/var/log/pm2/scc-api.err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
