/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed `output: 'export'` to allow Serverless API Routes for the Telegram Webhook!
    typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
