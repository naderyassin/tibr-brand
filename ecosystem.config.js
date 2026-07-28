module.exports = {
  apps: [
    {
      name: "tibr-shop",
      script: "server/index.js",
      // NOT "max". This runs on shared hosting with a Max Processes ceiling,
      // and "max" spawns one Node process per CPU core — several processes
      // before a single visitor arrives, which eats the budget the site needs
      // for actual traffic. Two gives redundancy during a reload without
      // meaningfully competing for the limit. Raise only after confirming
      // headroom in hPanel's resource usage graph.
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
