const mongoose = require('mongoose')
const domainSchema = require("../model/domain");

const process = require('process')
const child_process = require('child_process');


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
            poolSize: 5
        });
        if (con) {
            console.log("backgroundProcess: Connected Successful to the Database!");
        }
    } catch (err) {
        console.log("backgroundProcess: Not Connected to Database due to Error : " + err);
    }
})();



class backgroundProcessController {

    constructor(workerCount = 4) {
        this.autoCrawlTasks = []
        this.crawlWorkers = {}
        this.currentlyCrawling = []
        this.workerCount = workerCount

        for (let x = 0; x < workerCount; x++) {
            this.createCrawlWorker()
        }

        this.workerStatusMaintainer()
        this.autoCrawlLoop()
    }

    createCrawlWorker() {
        var worker = child_process.fork('./backgroundProcess/scraper.js')
        worker.on('message', async(m) => { this.workerMessageHandler(m) })
        worker.on('exit', (code) => { console.log("A crawlWorker died with code : ", code) })
        worker.unref();
        worker.ref();
        this.crawlWorkers[worker.pid] = [worker, Date.now(), []]
    }

    async enqueueCrawlTask([domainId, domainSitemap]) {
        try {
            if (this.currentlyCrawling.includes(domainId)) return false;

            var lowTaskedPid = Object.keys(this.crawlWorkers)[0]
            while (true) {
                for (let pid in this.crawlWorkers) {
                    if (this.crawlWorkers[pid][2].length <= this.crawlWorkers[lowTaskedPid][2])
                        lowTaskedPid = pid
                }
                if (this.crawlWorkers[lowTaskedPid][2].length < 4) { break }
                console.log(`backgroundProcess - enqueueCrawlTask - all workers are busy, sleeping for 15 seconds`)
                await snooze(15000)
            }
            if (this.currentlyCrawling.includes(domainId)) return false;

            this.currentlyCrawling.push(domainId)
            this.crawlWorkers[lowTaskedPid][0].send([1, [domainId, domainSitemap]])

            console.log(`backgroundProcess - enqueueCrawlTask - queued ${domainSitemap} to crawlWorker - ${lowTaskedPid}`)
            return true
        } catch (err) {
            console.error(`backgroundProcess - enqueueCrawlTask err: ${err}`)
            await snooze(1000)
        }
    }

    async workerStatusMaintainer() {
        while (true) {
            try {
                if (this.workerCount > this.crawlWorkers) {
                    for (let x = this.crawlWorkers.length; x <= this.workerCount; x++)
                        this.createCrawlWorker()
                }
                for (let pid in this.crawlWorkers) {
                    try {
                        if (Date.now() - this.crawlWorkers[pid][1] > 30000)
                            this.crawlWorkers[pid][0].send([0])
                    } catch (err) {
                        console.error(`Cant connect to crawlWorker - ${pid}`)
                        delete this.crawlWorkers[pid]
                    }
                }
                await snooze(1000)
            } catch (err) {
                console.error(`backgroundProcess - workerStatusMaintianer err: ${err}`)
                await snooze(1000)
            }
        }
    }

    async workerMessageHandler(message) {
        var pid = message[0]
        var messageCode = message[1]

        if (messageCode === 0) {
            this.crawlWorkers[pid][2] = message[2]
            this.crawlWorkers[pid][1] = Date.now()
        } else if (messageCode === 1) {
            var index = this.currentlyCrawling.indexOf(message[2])
            if (index !== -1)
                this.currentlyCrawling = this.currentlyCrawling.splice(index, 1)
        } else {
            console.error(`backgroundProcess - workerMessageHandler - Unknown message from crawlWorker : ${message}`)
        }
    }

    async die() {
        for (let pid in this.crawlWorkers) {
            try {
                this.crawlWorkers[pid][0].kill()
                console.log('backgroundProcess - Process killed : ', this.crawlWorkers[pid][0])
            } catch (err) {
                console.error(`backgroundProcess termination error while stopping worker: ${pid}`)
            }
        }
        process.exit(0)
    }

    parentMessageHandler = async(message) => {
        try {
            var messageCode = message[0]
            var messageArgs = message.slice(1)
            console.log("Backmessage: ", message)

            if (messageCode === 1) {
                for (let domainSitemap of messageArgs) {
                    var domainId = await domainSchema.findOne({ domainSitemap: domainSitemap })
                    if (!domainId)
                        throw new Error(`Not a proper Sitemap: ${domainSitemap}`)
                    var domainObj = [domainId._id, domainId.domainSitemap]
                    if (domainId._id)
                        await this.enqueueCrawlTask(domainObj)
                }
            } else if (messageCode === -1) { await this.die() }
        } catch (err) {
            console.error("backgroundProcess - messageHandler Error : ", err)
        }

    }

    autoCrawlLoop = async() => {
        while (true) {
            try {
                var startTime = Date.now()
                if (this.autoCrawlTasks.length === 0) {
                    var allDomains = await domainSchema.find({ blocked: false }, { _id: 1, domainSitemap: 1 })
                        .sort({ updatedAt: 1 })
                    allDomains.forEach((domain) => { this.autoCrawlTasks.push([domain._id, domain.domainSitemap]) })
                    let endTime = Date.now()
                    console.log('backgroundProcess - Added all the Sitemaps from Database - ', endTime - startTime, 'ms')
                }
                if (this.autoCrawlTasks.length === 0)
                    throw new Error('No sitemaps to scrape')
                var domainObj = this.autoCrawlTasks.shift()
                await this.enqueueCrawlTask(domainObj)
                var endTime = Date.now()
                if (60000 - endTime + startTime > 0)
                    await snooze(60000 - endTime + startTime)
                else
                    await snooze(60000)
            } catch (err) {
                console.error("backgroundProcess - autoCrawlLoop Error : ", err)
            }
            await snooze(30000)
        }

    }

};


backgroundProcessControllerObj = new backgroundProcessController()
process.on('message', async(message) => { backgroundProcessControllerObj.parentMessageHandler(message) })
process.on('exit', (code) => { console.log("backgroundProcess died with code : ", code) })