const mongoose = require('mongoose')
const scrapeModule = require('../backgroundProcess/scrape.js');
const domains = require('../model/domain')

const yargs = require('yargs');

const args = yargs.argv
const domainId = args.domainId;
const domainSitemap = args.domainSitemap;

(async() => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scraper'
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
    ]).catch(async(err) => {
        if (err.message !== 'timeout') {
            await domains.findByIdAndUpdate({ _id: domainId }, { blocked: true })
        }
        console.error(`crawlWorker[${domainSitemap}]: Scrapping ${domainSitemap} failed due to: ${err}`)
    })
    process.exit(0)
})();