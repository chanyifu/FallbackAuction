FROM node:22-slim

WORKDIR /app

# 先装依赖，利用层缓存
COPY contracts/package.json contracts/package-lock.json ./contracts/
RUN cd contracts && npm install

COPY contracts ./contracts
COPY web ./web

ENV PORT=8899
EXPOSE 8899

CMD ["bash", "contracts/scripts/boot.sh"]
