FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye

# Install global tools
RUN npm install -g expo-cli eas-cli prisma nodemon

# Install PostgreSQL inside container
RUN apt-get update && \
    apt-get install -y postgresql postgresql-contrib && \
    service postgresql start && \
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'universe';" && \
    sudo -u postgres createdb universe_db

EXPOSE 3000 5432 19000 19001 19002
