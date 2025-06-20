# CodeStudio Pro Ultimate 3.0 - 配置管理服务 Dockerfile
# 多阶段构建优化镜像大小

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖（仅生产依赖）
RUN npm ci --only=production && npm cache clean --force

# 运行阶段
FROM node:18-alpine AS runtime

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S codestudio -u 1001

# 设置工作目录
WORKDIR /app

# 复制依赖
COPY --from=builder --chown=codestudio:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=codestudio:nodejs . .

# 创建必要目录
RUN mkdir -p /app/logs /app/data/configs /app/data/templates && \
    chown -R codestudio:nodejs /app/logs /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3005

# 暴露端口
EXPOSE 3005

# 切换到非root用户
USER codestudio

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["node", "src/app.js"]
