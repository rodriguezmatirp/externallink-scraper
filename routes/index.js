var express = require("express");
var router = express.Router();

var masterController = require("../controller/masterController");
var statusController = require("../controller/statusController")
var filterController = require('../controller/filterController')
var userController = require('../controller/userController')
var getDataController = require('../controller/getDataController')
var externalLinkController = require('../controller/externalLinkController')

var domainSchema = require('../model/domain')
const { allAuth } = require("../middlewares/auth");

//Multi Processing - Scrapping sitemaps by queueing 
const process = require('process')
const child_process = require('child_process');
const monitorCrawlers = { crawlWorkers: [], crawlTasks: [] }

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

backgroundProcess = child_process.fork('./backgroundProcess/backgroundProcess.js')

// Handle messages from background process
backgroundProcess.on('message', (message) => {
    //console.log("Background Process message : ", message)
    const messageCode = message[0]
    const messageArgs = message.slice(1)
    if (messageCode === 2) {
        const statusDict = messageArgs[0]
        monitorCrawlers['crawlWorkers'] = statusDict['crawlWorkers']
        monitorCrawlers['crawlTasks'] = statusDict['crawlTasks']
    }
})

// Kill background process on exit
process.on('exit', (code) => {
    backgroundProcess.kill(15)
})


// Add all sitemaps to crawl in background process
router.get("/crawlAll", async(req, res, next) => {
    const domainsObj = await domainSchema.find({ blocked: false }, { domainSitemap: 1 });
    var domainsList = []
    for (let domainObj of domainsObj)
        domainsList.push(domainObj.domainSitemap)
    backgroundProcess.send([1, domainsList])
    res.status(200)
})

// Add one sitemap to crawl in background process
router.post('/crawl', async(req, res, next) => {
    var url = req.body.url

    const domain = await domainSchema.findOne({ domainSitemap: url })
    await domainSchema.findByIdAndUpdate({ _id: domain._id }, { blocked: false, blockedReason: '' })

    backgroundProcess.send([1, [domain.domainSitemap]])
    res.status(200).json({ result: "Queued the crawl job" })
})

// Get data on scheduled tasks and currentlt crawling domains
router.get('/crawlList', async(req, res, next) => {
    backgroundProcess.send([2])
    await snooze(250)
    res.status(200).json({ monitorCrawlers })
})

// Add a item to restricted schema
router.post('/restrict', async(req, res, next) => {
    var url = req.query.link
    var options = req.query.options
    const response = await filterController.add_(url, options)
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

// Delete a domain from Database
router.get('/deleteWebsite', async(req, res, next) => {
    const link = req.query.link
    const response = await masterController.deleteLink(link)
    if (response.err) {
        res.status(400).json({ err: 'Unable to delete' })
    } else {
        res.status(200).json({ status: 'Deleted Successfully!' })
    }
})

// Delete a restricted string from Database
router.get('/deleteRestricted', async(req, res, next) => {
    const link = req.query.link
    const type = req.query.type
    const response = await filterController.deleteRestrict(link, type)
    if (response.err) {
        res.status(400).json({ err: response.err })
    } else {
        res.status(200).json({ status: 'Deleted Successfully!' })
    }
})

// Get items from restricted schema
router.get('/restrict', async(req, res, next) => {
    const response = await filterController.get()
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

// Get info about all domains, the articles counts etc...
router.get('/info', async(req, res, next) => {
    const limit = req.query.limit
    const skip = req.query.skip
    const sort = req.query.sort
    const type = req.query.type
    const response = await masterController.websiteInfo(limit, skip, sort, type)
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

// Delete a user profile
router.get("/deleteProfile", async(req, res, next) => {
    var username = req.query.username
    const response = await userController.deleteProfile(username)
    if (response.err) {
        res.status(400).json({ result: response })
    } else {
        res.status(200).json(response)
    }
})

// Get a list of all users
router.get("/getUsers", async(req, res, next) => {
    const response = await userController.getUsers()
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

// Add a sitermap and queue it for scraping
router.post("/master", async(req, res, next) => {
    const response = await masterController.insert(req);
    if (response.err == null) {
        backgroundProcess.send([1, [response.result.domainSitemap]])
        res.status(200).json(response);
    } else {
        res.status(400).json(response);
    }
});

// Get a list of all domains
router.get("/master", async(req, res, next) => {
    const response = await masterController.getAllDomains();
    res.status(200).json(response);
});

// Get the external links based on the parameters
router.get('/getData', async(req, res, next) => {
    const type = req.query.type
    const link = req.query.link
    const start = req.query.start
    const end = req.query.end
    const skip = req.query.skip
    const limit = req.query.limit
        // console.log(type + '---------' + start + '-----------' + end + '----------' + link)
    const response = await getDataController.get(link, type, start, end, skip, limit)
    res.status(200).json({ result: response })
})

// Get the unique external links based on the parameters
router.get('/getExtLink', async(req, res, next) => {
    const limit = req.query.limit
    const skip = req.query.skip
    const start = req.query.start
    const end = req.query.end
    const sort = req.query.sort
    const type = req.query.type
    const showOnly = req.query.showOnly
    const response = await externalLinkController.getWithLimit(start, end, skip, limit, sort, type, showOnly)
    res.status(200).json(response)
})

// Get the unique external links based on the parameters as a File
router.get('/download', async(req, res, next) => {
    const limit = req.query.limit
    const skip = req.query.skip
    const start = req.query.start
    const end = req.query.end
    const sort = req.query.sort
    const type = req.query.type
    const showOnly = req.query.showOnly
    const result = await externalLinkController.getAsFile(start, end, skip, limit, sort, type, showOnly)
    if (result['error'] === undefined) {
        res.download(result["fileName"])
    } else
        res.status(400).json({ error: "Unable to generate a file to download" })
})

// Get the unique external links based on the parameters
router.get('/verify', async(req, res, next) => {
    const link = req.query.link
    const status = req.query.status
    const response = await externalLinkController.status(link, status)
    res.status(200).json(response)
})


module.exports = router;