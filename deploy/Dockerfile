FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/package-lock.json apps/web/package-lock.json
COPY packages/domain packages/domain
COPY apps/web apps/web
WORKDIR /app/apps/web
RUN npm ci && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
