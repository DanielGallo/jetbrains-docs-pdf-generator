FROM alpeware/chrome-headless-trunk
RUN apt-get update
    && sudo apt-get install curl
    && curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
    && apt-get install -y nodejs