module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'run start',
      cwd: 'C:/apcid_private', // Adjust this path if your project is elsewhere
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
