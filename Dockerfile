# Set the base image to Ubuntu
FROM ubuntu:14.04

MAINTAINER Allan Koch Veiga

# Install Node.js and other dependencies
RUN apt-get update && \
    apt-get -y install curl && \
    apt-get -y install git && \
    apt-get -y install wget && \
    curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash - && \
    apt-get install --yes nodejs 

RUN apt-get install build-essential -y && apt-get install imagemagick -y

# Install PM2
RUN npm install -g pm2

RUN mkdir -p /var/www/bdd

# Define working directory
WORKDIR /var/www/bdd

# ADD . /var/www/bdd

# Expose port
EXPOSE 3030

# Run app
CMD pm2 start ecosystem.json && pm2 logs 0 