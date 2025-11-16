FROM node:20-alpine

# Install mosquitto-clients for mosquitto_passwd command
RUN apk add --no-cache mosquitto-clients

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
