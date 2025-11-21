FROM node:22-slim

WORKDIR /app

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libexpat1 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  wget \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

# Build your Remotion project
# RUN cd remotion_templates/TemplateHolder && npm install && cd ../.. && npm run build

RUN cd remotion_templates/TemplateHolder && npm install && cd ../..
RUN npm run build

EXPOSE 10000

CMD ["npm", "start"]
