const mongoose = require('mongoose')
const scrapeModule = require('../backgroundProcess/scrape.js');

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

const args = require('yargs').argv;

const domainSitemap = args.sitemap;
const domainId = args.domainId;
console.log(`DomainName : ${domainSitemap}\nDomainId : ${domainId}`);

(async() => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test'
        const con = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            autoReconnect: true,
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 1000,
            poolSize: 2
        });
        if (con) {
            console.log(`crawlWorker[${domainSitemap}]: Connected Successful to the Database!`);
        }
    } catch (err) {
        console.log(`crawlWorker[${domainSitemap}]: Not Connected to Database due to Error : ${err}`);
    }
})();



(async() => {
    await Promise.race([scrapeModule.scrapeSitemap(domainSitemap, domainId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1800000))
    ]).catch(function(err) {
        console.error(`crawlWorker[${domainSitemap}]: Scrapping ${ domainSitemap } failed due to: ${ err }`)
    })
    process.exit(0)
})();