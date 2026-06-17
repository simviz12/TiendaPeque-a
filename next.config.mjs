/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,

  // Necesario para Prisma en Vercel (serverless)
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Excluir archivos pesados del bundle de Prisma
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/@swc/core-linux-x64-gnu",
      "./node_modules/@swc/core-linux-x64-musl",
      "./node_modules/@esbuild/linux-x64",
    ],
  },
};

export default nextConfig;
