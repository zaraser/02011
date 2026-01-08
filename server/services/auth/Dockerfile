# server/services/auth/Dockerfile   
FROM node:20-bullseye-slim

WORKDIR /auth

# ============================
# System deps (sqlite)
# ============================
RUN apt update \
 && apt install -y sqlite3 \
 && rm -rf /var/lib/apt/lists/*

# ============================
# Node deps
# ============================
COPY package.json package-lock.json* ./
RUN npm install

# ============================
# App source
# ============================
COPY . .

# ============================
# Build TypeScript
# ============================
RUN npm run build

EXPOSE 3001

# ============================
# Run compiled JS (NO ts-node)
# ============================
CMD ["npm", "run", "start"]
