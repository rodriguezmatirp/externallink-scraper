const mongoose = require('mongoose')
const domainSchema = require("../model/domain");
const linkSchema = require('../model/links')
const restrictedSchema = require('../model/restricted')

const child_process = require('child_process');

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

const timedPromiseLoop = (functionObj, waitTime, errorString = "Error: ") => {
    Promise.resolve().then(function resolver() {
        return functionObj()
            .then(setTimeout(resolver, waitTime))
            .catch((error) => {
                console.error(errorString + error);
            })
    })
}

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
            console.log("backgroundProcess: Connected Successful to the Database!");
        }
    } catch (err) {
        console.log("backgroundProcess: Not Connected to Database due to Error : " + err);
    }
})();


class backgroundProcess {

    constructor(maxWorkerCount = 5) {
        this.crawlTasks = []
        this.autoCrawlTasks = []
        this.filterLimit = 5000
        this.crawlWorkers = {}
        this.maxWorkerCount = maxWorkerCount
        timedPromiseLoop(this.workerCheck, 5000, "backgroundProcess - workerCheck Error")
        timedPromiseLoop(this.addCrawlTask, 120000, "backgroundProcess - addCrawlTask Error")
        timedPromiseLoop(this.filterExternalLinks, 600000, "backgroundProcess - addCrawlTask Error")
    }

    createCrawlWorker([domainId, domainSitemap]) {
        const worker = child_process.fork(`./backgroundProcess/scraper.js`, ['--domainSitemap', domainSitemap, '--domainId', domainId]);
        worker.on('exit', (code) => {
            delete this.crawlWorkers[domainSitemap]
            console.log(`crawlWorker[${domainSitemap}] died with code : ${code}`)
        })
        this.crawlWorkers[domainSitemap] = [worker, Date.now()]
    }

    workerCheck = async() => {
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
    }

    parentMessageHandler = async(message) => {
        try {
            const messageCode = message[0]
            const messageArgs = message.slice(1)

            if (messageCode === 1) {
                const sitemaps = messageArgs[0]
                for (let domainSitemap of sitemaps) {
                    const domainId = await domainSchema.findOne({ domainSitemap: domainSitemap });
                    if (!domainId)
                        console.error(`Not a proper Sitemap: ${domainSitemap}`)
                    const domainObj = [domainId._id, domainId.domainSitemap];
                    if (!this.crawlTasks.some(domainObjInList => domainObjInList[1].includes(domainId.domainSitemap)))
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
                    this.crawlTasks.forEach((task) => {
                        sitemaps.push(task[1])
                    })
                    return sitemaps
                })();
                process.send([2, monitorCrawlTasks])
            } else if (messageCode === 3) {
                this.filterWorkerEnabled = true
            }
        } catch (err) {
            console.error("backgroundProcess - messageHandler Error : ", err)
        }
    }

    filterExternalLinks = async() => {
        const linksCount = await linkSchema.find().countDocuments()

        for (let skip = 0; skip < linksCount; skip += this.filterLimit) {
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
                .limit(this.filterLimit)

            for (let externalLinkObj of externalLinkObjs) {
                let shouldBeHidden = filterForAll.some(str => externalLinkObj['externalLink'].includes(str))

                if (!shouldBeHidden && externalLinkObj['domainId'] === stalkyDomainObj._id)
                    shouldBeHidden = filterExceptStalky.some(str => externalLinkObj['externalLink'].includes(str))

                if (shouldBeHidden !== externalLinkObj['isHidden']) {
                    await linkSchema.findOneAndUpdate({ _id: externalLinkObj._id }, { isHidden: shouldBeHidden })
                        //console.log(`${externalLinkObj['externalLink']} - change isHidden to ${shouldBeHidden}`)
                }
            }
            await snooze(5000)
        }

    }

    addCrawlTask = async() => {
        const startTime = Date.now();
        if (this.autoCrawlTasks.length === 0) {
            const allDomains = await domainSchema.find({ blocked: false }, { _id: 1, domainSitemap: 1 })
                .sort({ updatedAt: 1 })
            allDomains.forEach((domain) => {
                this.autoCrawlTasks.push([domain._id, domain.domainSitemap])
            })
            let endTime = Date.now()
            console.log('backgroundProcess - Added all the Sitemaps from Database - ', endTime - startTime, 'ms')
        }
        if (this.autoCrawlTasks.length === 0)
            console.log('No sitemaps to scrape')

        const domainObj = this.autoCrawlTasks.shift()
        if (!this.crawlTasks.some(domainObjInList => domainObjInList[1].includes(domainObj[1])))
            this.crawlTasks.push(domainObj)
    }


}

backgroundProcessObj = new backgroundProcess()
process.on('message', async(message) => {
    await backgroundProcessObj.parentMessageHandler(message)
})
process.on('exit', (code) => {
    console.log("backgroundProcess died with code : ", code)
})