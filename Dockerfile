FROM emethium/puppeteer-in-docker:2.0.0 as development
ENV  PATH=${PATH}:/node_modules/.bin:/app/bin

WORKDIR /app
EXPOSE 3000

ENTRYPOINT [ "entrypoint" ]