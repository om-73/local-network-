FROM node:18-slim

# Install tshark (Wireshark command line tool)
# DEBIAN_FRONTEND=noninteractive avoids the interactive configuration prompt
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y tshark && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port (default for Render is usually 10000 or defined by env, but app listens on 3000? Check server.js)
# Let's assume standard 3000 but Render sets PORT env var.
EXPOSE 3000

# Start command
CMD [ "npm", "start" ]
