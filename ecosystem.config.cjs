module.exports = {
  apps: [
    {
      name: 'telegram-kuliah-bot',
      script: './src/index.js',
      watch: false,
      restart_delay: 5000,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
