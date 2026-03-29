# ════════════════════════════════════════════════════════
#  Stage 1: BUILD
#  Cài đặt devDependencies + build TypeScript → JavaScript
# ════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files trước để tận dụng Docker layer caching
COPY package*.json ./

# Cài đặt TẤT CẢ dependencies (cả dev) để có thể build TypeScript
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript → dist/
RUN npm run build

# ════════════════════════════════════════════════════════
#  Stage 2: PRODUCTION
#  Chỉ copy output đã build + production dependencies
#  → Image nhỏ gọn, không có devDependencies hay source TS
# ════════════════════════════════════════════════════════
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Set môi trường là production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Chỉ cài production dependencies (không có ts-node, jest, v.v.)
RUN npm ci --omit=dev

# Copy toàn bộ output đã build từ stage 1
COPY --from=builder /usr/src/app/dist ./dist

# Tạo thư mục uploads (sẽ được mount qua volume)
RUN mkdir -p uploads

# Mở port 3000
EXPOSE 3000

# Chạy ứng dụng production
CMD ["node", "dist/main"]
