FROM node:20-bookworm-slim

# Install system dependencies including Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Create Python virtual environment and set it in PATH
ENV VIRTUAL_ENV=/app/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy python dependencies
COPY scraper/requirements.txt ./scraper/

# Install python dependencies
RUN pip install --no-cache-dir -r scraper/requirements.txt

# Install Playwright browser and OS dependencies (this covers Chromium/Puppeteer needs)
RUN playwright install chromium --with-deps

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
