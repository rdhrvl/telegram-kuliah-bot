FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production

# Command to run the bot
CMD ["node", "src/index.js"]
