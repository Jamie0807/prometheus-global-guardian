/**
 * 定义 Vite 开发服务器、构建分块与插件配置。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryRoot = fileURLToPath(new URL(".", import.meta.url));

// Vite 配置文档：https://vite.dev/config/
export default defineConfig({
  root: "apps/web",
  envDir: repositoryRoot,
  plugins: [react()],
  server: {
    proxy: {
      "/api/ai": {
        target: "http://localhost:8080",
        changeOrigin: false,
        secure: false,
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: false,
        secure: false,
      },
    },
  },
  build: {
    outDir: path.resolve(repositoryRoot, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 手动配置代码分块策略
        manualChunks: {
          // React核心库单独打包
          "react-vendor": ["react", "react-dom"],
          // 地图库单独打包（体积大）
          "mapbox-vendor": ["mapbox-gl"],
          // 图表库单独打包（体积大）
          "charts-vendor": ["recharts"],
          // 日期和工具库
          "utils-vendor": ["date-fns", "lodash"],
        },
      },
    },
    // 提高chunk大小警告阈值（因为已经做了分块）
    chunkSizeWarningLimit: 1000,
  },
});
