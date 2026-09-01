import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/ai": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false
      },
      "/api": {
        target: "https://api.disasteraware.com",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ""),
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // 手动配置代码分块策略
        manualChunks: {
          // React核心库单独打包
          'react-vendor': ['react', 'react-dom'],
          // 地图库单独打包（体积大）
          'mapbox-vendor': ['mapbox-gl'],
          // 图表库单独打包（体积大）
          'charts-vendor': ['recharts'],
          // 日期和工具库
          'utils-vendor': ['date-fns', 'lodash']
        }
      }
    },
    // 提高chunk大小警告阈值（因为已经做了分块）
    chunkSizeWarningLimit: 1000
  }
});
