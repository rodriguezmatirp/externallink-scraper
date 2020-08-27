const mongoose = require('mongoose')
const domainSchema = require("../model/domain");
const linkSchema = require('../model/links')
const restrictedSchema = require('../model/restricted')

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
            poolSize: 2
        });
        if (con) {
            console.log("backgroundProcess: Connected Successful to the Database!");
        }
    } catch (err) {
        console.log("backgroundProcess: Not Connected to Database due to Error : " + err);
    }
})();


class backgroundProcessController {

    constructor(maxWorkerCount = 5) {
        this.crawlTasks = []
        this.filterWorkerEnabled = true
        this.crawlWorkers = {}
        this.maxWorkerCount = maxWorkerCount
        this.workerMaintainer()
        this.autoCrawlLoop()
        this.autoFilterLoop()
    }

    createCrawlWorker([domainId, domainSitemap]) {
        var worker = child_process.fork(`./backgroundProcess/scraper.js`, ['--sitemap', domainSitemap, '--domainId', domainId])
        worker.on('exit', (code) => {
            delete this.crawlWorkers[domainSitemap]
            console.log(`crawlWorker[${domainSitemap}] died with code : ${code}`)
        })
        this.crawlWorkers[domainSitemap] = [worker, Date.now()]
    }

    workerMaintainer = async() => {
        while (true) {
            try {
                if (this.maxWorkerCount > Object.keys(this.crawlWorkers).length && this.crawlTasks.length > 0) {
                    const [domainId, domainSitemap] = this.crawlTasks.shift()
                    this.createCrawlWorker([domainId, domainSitemap])
                    console.log(`backgroundProcess - Created a worker for ${domainSitemap}`)
                }
                for (let domainSitemap in this.crawlWorkers) {
                    if (Date.now() - this.crawlWorkers[domainSitemap][1] > 1800000) {
                        this.crawlWorkers[domainSitemap][0].kill(15)
                        delete this.crawlWorkers[domainSitemap]
                    }
                }
            } catch (err) {
                console.error(`backgroundProcess - workerStatusMaintianer err: ${err}`)
            }
            await snooze(10000)
        }
    }

    parentMessageHandler = async(message) => {
        try {
            const messageCode = message[0]
            const messageArgs = message.slice(1)

            if (messageCode === 1) {
                const sitemaps = messageArgs[0]
                for (let domainSitemap of sitemaps) {
                    var domainId = await domainSchema.findOne({ domainSitemap: domainSitemap })
                    if (!domainId)
                        throw new Error(`Not a proper Sitemap: ${domainSitemap}`)
                    var domainObj = [domainId._id, domainId.domainSitemap]
                    if (domainId._id && !this.crawlTasks.some(domainObjInList => domainObjInList[1].includes(domainId.domainSitemap)))
                        this.crawlTasks.push(domainObj)
                }
            } else if (messageCode === 2) {
                const monitorCrawlTasks = {}

                monitorCrawlTasks['crawlWorkers'] = (() => {
                    const crawlWorkers = []
                    Object.keys(this.crawlWorkers).forEach((domainSitemap) => {
                        crawlWorkers.push({
                            domainSitemap: domainSitemap,
                            crawlTime: Date.now() - this.crawlWorkers[domainSitemap][1]
                        })
                    })
                    return crawlWorkers
                })();

                monitorCrawlTasks['crawlTasks'] = (() => {
                    const sitemaps = []
                    this.crawlTasks.forEach((task) => { sitemaps.push(task[1]) })
                    return sitemaps
                })();
                process.send([2, monitorCrawlTasks])
            } else if (messageCode === 3) {
                this.filterWorkerEnabled = true
            } else if (messageCode === -1) { await this.die() }
        } catch (err) {
            console.error("backgroundProcess - messageHandler Error : ", err)
        }
    }

    autoFilterLoop = async() => {
        const limit = 5000
        while (true) {
            if (!this.filterWorkerEnabled) {
                await snooze(10000)
                continue
            }
            setTimeout(() => { this.filterWorkerEnabled = true }, 1000)

            const linksCount = await linkSchema.find().countDocuments()
            var skip = 0

            while (skip < linksCount) {
                const filterForAll = [],
                    filterExceptStalky = []

                const stalkyDomainObj = domainSchema.findOne({ domainSitemap: "https://startuptalky.com/sitemap.xml" })

                const restrict = await restrictedSchema.find()
                restrict.forEach((data) => {
                    if (data.restricted_type === "EST")
                        filterExceptStalky.push(data.restricted_link)
                    else
                        filterForAll.push(data.restricted_link)
                })

                const externalLinkObjs = await linkSchema.find({}, { _id: 1, domainId: 1, externalLink: 1, isHidden: 1 })
                    .skip(skip)
                    .limit(limit)

                skip += limit
                for (let externalLinkObj of externalLinkObjs) {
                    var shouldBeHidden = filterForAll.some(restricted => externalLinkObj['externalLink'].includes(restricted))

                    if (!shouldBeHidden && externalLinkObj['domainId'] === stalkyDomainObj._id)
                        shouldBeHidden = filterExceptStalky.some(restricted => externalLinkObj['externalLink'].includes(restricted))

                    if (shouldBeHidden !== externalLinkObj['isHidden']) {
                        await linkSchema.findOneAndUpdate({ _id: externalLinkObj._id }, { isHidden: shouldBeHidden })
                        console.log(`${externalLinkObj['externalLink']} - shouldBeHidden ${shouldBeHidden}`)
                    }
                }
                await snooze(30000)
            }

            this.filterWorkerEnabled = false
        }
    }

    autoCrawlLoop = async() => {
        var autoCrawlTasks = []
        while (true) {
            await snooze(30000)
            try {
                var startTime = Date.now()
                if (autoCrawlTasks.length === 0) {
                    var allDomains = await domainSchema.find({ blocked: false }, { _id: 1, domainSitemap: 1 })
                        .sort({ updatedAt: 1 })
                    allDomains.forEach((domain) => { autoCrawlTasks.push([domain._id, domain.domainSitemap]) })
                    let endTime = Date.now()
                    console.log('backgroundProcess - Added all the Sitemaps from Database - ', endTime - startTime, 'ms')
                }
                if (autoCrawlTasks.length === 0)
                    throw new Error('No sitemaps to scrape')

                const domainObj = autoCrawlTasks.shift()
                if (!this.crawlTasks.some(domainObjInList => domainObjInList[1].includes(domainId.domainSitemap)))
                    this.crawlTasks.push(domainObj)
                var endTime = Date.now()
                if (60000 - endTime + startTime > 0)
                    await snooze(30000 - endTime + startTime)
                else
                    await snooze(30000)
            } catch (err) {
                console.error("backgroundProcess - autoCrawlLoop Error : ", err)
            }
        }

    }

}

backgroundProcessControllerObj = new backgroundProcessController()
process.on('message', async(message) => { backgroundProcessControllerObj.parentMessageHandler(message) })
process.on('exit', (code) => { console.log("backgroundProcess died with code : ", code) })