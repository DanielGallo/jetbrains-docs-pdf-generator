FROM pandoc/latex:latest
RUN apt-get update && apt-get install -y wkhtmltopdf xvfb