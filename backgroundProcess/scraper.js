const process = require('process')
const mongoose = require('mongoose')
const scrapeModule = require('../backgroundProcess/scrape.js')

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

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
            poolSize: 3
        });
        if (con) {
            console.log(`crawlWorker[${process.pid}]: Connected Successful to the Database!`);
        }
    } catch (err) {
        console.log(`crawlWorker[${process.pid}]: Not Connected to Database due to Error : ${err}`);
    }
})();


class scrapeWorkerController {
    constructor(maxPromisesCount = 4) {
        this.maxPromisesCount = maxPromisesCount
        this.domainIdsBeingScraped = []
    }

    async parentMessageHandler(message) {
        var messageCode = message[0]

        if (messageCode === 0)
            process.send([process.pid, 0, this.domainIdsBeingScraped])
        else if (messageCode === 1)
            this.scrape(message[1])
        else
            console.error(`crawlWorker[${process.pid}]: Unknown message from parent : ${message} `)
    }

    async scrape([domainId, domainSitemap]) {
        if (!this.domainIdsBeingScraped.includes(domainId)
            //  && this.domainIdsBeingScraped.length >= this.maxPromisesCount
        ) {
            this.domainIdsBeingScraped.push(domainId)
            console.log('here')
            await Promise.race([scrapeModule.scrapeSitemap(domainSitemap, domainId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3600000))
            ]).catch(function(err) {
                console.error(`crawlWorker[${process.pid}]: Scrapping ${ domainSitemap } failed due to: ${ err }`)
            })

            var index = this.domainIdsBeingScraped.indexOf(domainId)
            if (index != -1) {
                console.log(`crawlWorker[${process.pid}]: Removing ${domainId} from scrapelist: ${this.domainIdsBeingScraped}`)
                this.domainIdsBeingScraped = this.domainIdsBeingScraped.splice(index, 1)
            }
        }
        process.send([process.pid, 1, domainId])
    }
}

scrapeWorkerControllerObj = new scrapeWorkerController()
process.on('message', async(m) => { scrapeWorkerControllerObj.parentMessageHandler(m) })