# Set the base image to Ubuntu
FROM ubuntu:14.04

# Install Node.js and other dependencies
RUN apt-get update && \
    apt-get -y install curl && \
    apt-get -y install git && \
    apt-get -y install wget && \
    curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash - && \
    apt-get install --yes nodejs && \
    apt-get -y install build-essential && \
    apt-get -y install imagemagick

# Install PM2
RUN npm install -g pm2
RUN npm install -g bower

RUN mkdir -p /var/www/bdd

# Define working directory
WORKDIR /var/www/bdd

# ADD . /var/www/bdd

# Expose port
EXPOSE 3030

RUN npm install
RUN bower install

# Run app
CMD pm2 start ecosystem.json && pm2 logs 0 