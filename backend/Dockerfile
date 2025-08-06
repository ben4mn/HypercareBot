FROM node:20-alpine

WORKDIR /app

# Install system dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /data/database /data/uploads /data/vectors

# Expose port
EXPOSE 3050

# Start the application
CMD ["npm", "start"]