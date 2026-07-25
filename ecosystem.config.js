module.exports = {
  apps: [
    {
      name: "tibr-shop",
      script: "server/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
