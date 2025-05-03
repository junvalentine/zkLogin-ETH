FROM node:20 AS backend

WORKDIR /app

COPY account-abstraction/package*.json ./
RUN yarn install

COPY account-abstraction/ .

RUN npx hardhat compile

EXPOSE 3001
CMD ["npx", "hardhat", "run", "src/server.ts"]