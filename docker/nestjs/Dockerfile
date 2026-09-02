FROM node:22-alpine

WORKDIR /app

COPY backend-nestjs/package.json backend-nestjs/package-lock.json ./

RUN npm ci

COPY backend-nestjs ./

EXPOSE 3000 9229

CMD ["npm", "run", "start:debug:docker"]