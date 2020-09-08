const mongoose = require('mongoose')
const scrapeModule = require('../backgroundProcess/scrape.js');
const domains = require('../model/domain')

const yargs = require('yargs');

//For getting Command Line Arguments
const args = yargs.argv
const domainId = args.domainId;
const domainSitemap = args.domainSitemap;

//MongoDB connection
(async() => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test'
        const con = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            // autoReconnect: true,
            // reconnectTries: Number.MAX_VALUE,
            // reconnectInterval: 1000,
            poolSize: 2,
            useUnifiedTopology: true
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
        //Each Sitemap will run only for 1 hour and terminates after that
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3600000))
    ]).then(async() => {
        await domains.findByIdAndUpdate({ _id: domainId }, { blocked: false })
            //In case if a website runs for less than 1 hour, updatedAt property is updated by modifying blocked property
        await domains.findOneAndUpdate({ _id: domainId, websiteCount: 0 }, { blocked: true, blockedReason: 'No articles Found' })
    }).catch(async(err) => {
        if (err.message !== 'timeout') {
            //Other than timeout error from promise , rest will be blocked from crawling for the next time 
            await domains.findByIdAndUpdate({ _id: domainId }, { blocked: true, blockedReason: err.message })
        }
        console.error(`crawlWorker[${domainSitemap}]: Scrapping ${domainSitemap} failed due to: ${err}`)
    })
    process.exit(0)
})();