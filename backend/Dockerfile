FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /data/uploads

# Expose port
EXPOSE 3050

# Start the application
CMD ["npm", "start"]