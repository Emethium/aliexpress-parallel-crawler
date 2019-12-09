FROM emethium/puppeteer-in-docker:1.20 as development
ENV  PATH=${PATH}:/node_modules/.bin:/app/bin

WORKDIR /app
EXPOSE 3000

ENTRYPOINT [ "entrypoint" ]