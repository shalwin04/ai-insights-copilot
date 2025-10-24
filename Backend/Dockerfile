# Use official Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm install -g typescript
RUN npm run build

# Remove dev dependencies and source files to reduce image size
RUN npm prune --production
RUN rm -rf src tsconfig.json

# Expose port (Cloud Run will override this)
EXPOSE 8080

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
