// PM2 config for LOCAL sandbox testing of the built Cloudflare Worker.
// Not used in production — Cloudflare deploys the worker from Git.
// Runs against an isolated copy of the nitro output (compat date patched
// to a locally-supported value) to avoid the deploy-config conflict.
module.exports = {
  apps: [
    {
      name: "frame-it",
      script: "npx",
      args:
        "wrangler dev --config /tmp/frametest/server/wrangler.json --ip 0.0.0.0 --port 3000 --local",
      cwd: "/tmp/frametest",
      env: { NODE_ENV: "development" },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
