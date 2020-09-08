const mongoose = require("mongoose");
const domainSchema = require("../model/domain");
const linkSchema = require("../model/links");
const restrictedSchema = require("../model/restricted");

const child_process = require("child_process"); // child_process to manage the scraper processes

const snooze = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // async sleep function

// Function that chains promises to imitiate a infinte loop
// Use to run certain tasks regularly
const timedPromiseLoop = (functionObj, waitTime, errorString = "Error: ") => {
    Promise.resolve().then(function resolver() {
        return functionObj()
            .then(setTimeout(resolver, waitTime))
            .catch((error) => {
                console.error(errorString + error);
            });
    });
};

// Mongo DB connection
(async() => {
    try {
        const mongoUri =
            process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test";
        const con = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            autoReconnect: true,
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 1000,
            poolSize: 2,
        });
        if (con) {
            console.log("backgroundProcess: Connected Successful to the Database!");
        }
    } catch (err) {
        console.log(
            "backgroundProcess: Not Connected to Database due to Error : " + err
        );
    }
})();

// class to provide a interface to control the background process
class backgroundProcess {
    constructor(maxWorkerCount = 5) {
        this.crawlTasks = []; // holds only the manual crawl tasks(ones stared from frontend) that are yet to be started
        this.autoCrawlTasks = []; // holds the auto crawl tasks that are scheduled regularly
        this.filterLimit = 5000; // Number of records to request in each query to database for the filter process
        this.crawlWorkers = {}; // holds all the crawlWorkers objects and data about the domains that are being scraped
        this.maxWorkerCount = maxWorkerCount; // Maximum Number of scraping processes allowed

        // Tasks to repeat regularly for stable operation
        timedPromiseLoop(
            this.workerCheck,
            5000,
            "backgroundProcess - workerCheck Error"
        );
        timedPromiseLoop(
            this.addCrawlTask,
            120000,
            "backgroundProcess - addCrawlTask Error"
        );
        timedPromiseLoop(
            this.filterExternalLinks,
            600000,
            "backgroundProcess - addCrawlTask Error"
        );
    }

    // Function used to create a crawlWorker(a child process that scrapes a domain)
    createCrawlWorker([domainId, domainSitemap]) {
        // domainSitemap and domainId(Mongo Object ID) are fed as commandline args
        const worker = child_process.fork(`./backgroundProcess/scraper.js`, [
            "--domainSitemap",
            domainSitemap,
            "--domainId",
            domainId,
        ]);
        worker.on("exit", (code) => {
            delete this.crawlWorkers[domainSitemap];
            console.log(`crawlWorker[${domainSitemap}] died with code : ${code}`);
        });
        this.crawlWorkers[domainSitemap] = [worker, Date.now()];
    }

    // Regular Task
    // Checks if a crawlWorker has finished scraping a sitemap and upadtes crawlWorkers property of the instance
    // Creates new crawlWorker if there are items in crawlTasks and the limit is not hit.
    workerCheck = async() => {
        if (
            this.maxWorkerCount > Object.keys(this.crawlWorkers).length &&
            this.crawlTasks.length > 0
        ) {
            const [domainId, domainSitemap] = this.crawlTasks.shift();
            if (this.crawlWorkers[domainSitemap] === undefined) {
                this.createCrawlWorker([domainId, domainSitemap]);
                console.log(
                    `backgroundProcess - Created a worker for ${domainSitemap}`
                );
            }
        }
        for (let domainSitemap in this.crawlWorkers) {
            if (Date.now() - this.crawlWorkers[domainSitemap][1] > 1800000) {
                this.crawlWorkers[domainSitemap][0].kill(15);
                delete this.crawlWorkers[domainSitemap];
            }
        }
    };

    // Promise which is called when the parent process(backend) sends a message
    parentMessageHandler = async(message) => {
        try {
            const messageCode = message[0];
            const messageArgs = message.slice(1); // a list containing the argumensts/elements required to handle a message

            if (messageCode === 1) {
                // Message code 1 indicates that there are sitemaps to scrape
                // Sitemaps are a list present in messageArgs
                const sitemaps = messageArgs[0];
                for (let domainSitemap of sitemaps) {
                    const domainId = await domainSchema.findOne({
                        domainSitemap: domainSitemap,
                    });
                    if (!domainId)
                        console.error(`Not a proper Sitemap: ${domainSitemap}`);
                    const domainObj = [domainId._id, domainId.domainSitemap];

                    // Sitemap is added to crawlTasks only if its not already scheduled
                    if (!this.crawlTasks.some((domainObjInList) => domainObjInList[1].includes(domainId.domainSitemap)))
                        this.crawlTasks.push(domainObj);
                }
            } else if (messageCode === 2) {
                // Message code 2 indicates that parent wants details of crawlTasks adn crawlWorkers
                const monitorCrawlTasks = {};

                monitorCrawlTasks["crawlWorkers"] = (() => {
                    const crawlWorkers = []; // adding details about the crawlWorkers
                    Object.keys(this.crawlWorkers).forEach((domainSitemap) => {
                        crawlWorkers.push({
                            domainSitemap: domainSitemap,
                            crawlTime: Date.now() - this.crawlWorkers[domainSitemap][1],
                        });
                    });
                    return crawlWorkers;
                })();

                monitorCrawlTasks["crawlTasks"] = (() => {
                    const sitemaps = []; // adding details about the crawlTasks
                    this.crawlTasks.forEach((task) => {
                        sitemaps.push(task[1]);
                    });
                    return sitemaps;
                })();
                process.send([2, monitorCrawlTasks]); // sends the result back to parent
            } else if (messageCode === 3) {
                // Not currently used, might be needed to scale
                // Message code 3 indicates that a filter tasks needs to be executed

                //await this.filterExternalLinks()
            }
        } catch (err) {
            console.error("backgroundProcess - messageHandler Error : ", err);
        }
    };

    // Regular Task
    // Filters any external links that contains a string present in restrictedSchema
    filterExternalLinks = async() => {
        const linksCount = await linkSchema.find().countDocuments();
        // Get total count of all links

        // Repeat until all links are checked. Increments in each iteration is filterLimit
        for (let skip = 0; skip < linksCount; skip += this.filterLimit) {
            const filterForAll = [],
                filterExceptStalky = [];
            // Strings to filter can be of two types:
            //     1. EST - Except Startup talky
            //     2. All(including Startup talky)

            // Get the stalky domain Object
            const stalkyDomainObj = domainSchema.findOne({
                domainSitemap: "https://startuptalky.com/sitemap.xml",
            });

            // Get the restriced strings Object
            const restrict = await restrictedSchema.find();
            restrict.forEach((data) => {
                if (data.restricted_type === "EST")
                    filterExceptStalky.push(data.restricted_link);
                else filterForAll.push(data.restricted_link);
            });

            // Get a batch of external links in each iteration
            const externalLinkObjs = await linkSchema
                .find({}, { _id: 1, domainId: 1, externalLink: 1, isHidden: 1 })
                .skip(skip)
                .limit(this.filterLimit);

            // Checking each link
            for (let externalLinkObj of externalLinkObjs) {

                // check if link has a restricted string 
                let shouldBeHidden = filterForAll.some((str) =>
                    externalLinkObj["externalLink"].includes(str)
                );

                if (!shouldBeHidden &&
                    externalLinkObj["domainId"] === stalkyDomainObj._id
                )
                    shouldBeHidden = filterExceptStalky.some((str) =>
                        externalLinkObj["externalLink"].includes(str)
                    );

                // Updating db if the state in Database is different from the result
                if (shouldBeHidden !== externalLinkObj["isHidden"]) {
                    await linkSchema.findOneAndUpdate({ _id: externalLinkObj._id }, { isHidden: shouldBeHidden });
                    //console.log(`${externalLinkObj['externalLink']} - change isHidden to ${shouldBeHidden}`)
                }
            }
            await snooze(5000);
        }
    };

    // Async Function to add a domainSitemap to crawlTasks
    addCrawlTask = async() => {
        const startTime = Date.now();

        // Add items to autoCrawlTask if its empty
        if (this.autoCrawlTasks.length === 0) {
            const allDomains = await domainSchema
                .find({ blocked: false }, { _id: 1, domainSitemap: 1 })
                .sort({ updatedAt: 1 }); // from where to start?
            allDomains.forEach((domain) => {
                this.autoCrawlTasks.push([domain._id, domain.domainSitemap]);
            });
            let endTime = Date.now();
            console.log(
                "backgroundProcess - Added all the Sitemaps from Database - ",
                endTime - startTime,
                "ms"
            );
        }

        // Check for no sitemaps in Db
        if (this.autoCrawlTasks.length === 0) console.log("No sitemaps to scrape");

        // Get a domainObj from the autoCrawlTasks and add to crawlTasks if not present
        const domainObj = this.autoCrawlTasks.shift();
        if (!this.crawlTasks.some((domainObjInList) =>
                domainObjInList[1].includes(domainObj[1])
            ))
            this.crawlTasks.push(domainObj);
    };
}


backgroundProcessObj = new backgroundProcess();

// Linking a message to the process to the parentMessageHandler
process.on("message", async(message) => {
    await backgroundProcessObj.parentMessageHandler(message);
});

// Overriding the exit event to stop child processes
process.on("exit", (code) => {
    for (let workerKey in backgroundProcessObj.crawlWorkers) {
        backgroundProcessObj.crawlWorkers[workerKey][0].kill(15);
        console.log(`backgroundProcess - Killed crawlWorkers[${workerKey}]`);
    }
    console.log("backgroundProcess died with code : ", code);
});