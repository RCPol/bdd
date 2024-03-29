# Set the base image to Ubuntu
FROM ubuntu:14.04

# Install Node.js and other dependencies
# RUN apk add --update \
#     python \
#     python-dev \
#     py-pip \
#     build-base \
#   && pip install virtualenv \
#   && rm -rf /var/cache/apk/*

# RUN apk --no-cache add --virtual native-deps \
#   g++ gcc libgcc libstdc++ linux-headers make python && \
#   npm install --quiet node-gyp -g &&\
#   npm install --quiet && \
#   apk del native-deps

RUN apt-get update && \
    apt-get -y --force-yes install curl && \
    apt-get -y --force-yes install git && \
    apt-get -y --force-yes install wget && \
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash - && \
    apt-get install -y --force-yes nodejs && \
    apt-get -y --force-yes install build-essential && \
    apt-get -y --force-yes install imagemagick && \
    apt-get -y --force-yes install ntpdate && \
    apt-get -y --force-yes install ntp
    
RUN cat /etc/ntp.conf
RUN echo "server pool.ntp.org" >> /etc/ntp.conf
RUN /etc/init.d/ntp stop && ntpdate pool.ntp.org && /etc/init.d/ntp start

ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install PM2
RUN npm install -g pm2@2.6.0
RUN npm install -g bower

RUN mkdir -p /var/www/bdd

# Define working directory
WORKDIR /var/www/bdd

ADD . /var/www/bdd
RUN npm i
RUN npm install --unsafe-perm
RUN npm rebuild grpc --force
# Expose port
EXPOSE 3030

# RUN npm install
# RUN bower install

# Run app
CMD ["pm2-docker", "/var/www/bdd/ecosystem.json"]
# CMD pm2 start ecosystem.json && pm2 logs 0 