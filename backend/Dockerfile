FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the codebase
COPY . .

# Generate Prisma client first, so TypeScript can find the exports during build
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Debug the build output
RUN echo "Checking dist folder content" && ls -la dist/

# Debug the main.js file to make sure it's there
RUN if [ -f dist/src/main.js ]; then echo "dist/src/main.js exists"; else echo "dist/src/main.js does not exist"; fi

# Make sure the dist directory is not excluded
RUN mkdir -p dist

# Use a shell form CMD so we can verify the app directory
CMD ["npm", "run", "start:prod"]
