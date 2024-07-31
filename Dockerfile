# Use an image with LaTeX installed
FROM texlive/texlive:latest

# Install Node.js
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Install application dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose the port
EXPOSE 8080

# Command to run the application
CMD ["node", "server.js"]
