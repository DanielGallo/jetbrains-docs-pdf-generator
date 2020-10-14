FROM alpeware/chrome-headless-trunk
RUN apt-get update
RUN apt-get install --yes curl
RUN curl --silent --location https://deb.nodesource.com/setup_12.x | sudo bash -
RUN apt-get install --yes nodejs