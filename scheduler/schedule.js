const mongoose = require('mongoose')
const master = require('../model/master')

const algo1 = require('../controller/algo1Controller')

const sitemaps = [] // Used to maintain a list of sitemaps

module.exports.tasksList = tasksList = []

// Crawler loop crawls URLs from tasklist
module.exports.crawlerLoop = crawler = async() => {
    console.log("Crawler Tasks: ", tasksList)

    var tasksLength = tasksList.length ? tasksList.length : 0;
    if (tasksLength !== 0) {
        var taskURL = tasksList.shift()
        try {

            await algo1.algo1({ body: { url: taskURL } })
            console.log('Crawled ' + taskURL + ' - from CrawlerLoop')
            setTimeout(crawler, 20000, tasksList);
        } catch (e) {
            console.log("Crawler Error for  : ", taskURL)
            setTimeout(crawler, 2000, tasksList)
        }
    } else {
        console.log('No URLs to crawl')
        setTimeout(crawler, 20000, tasksList);
    }
}

// Scheduler loop schedules crawl tasks into tasklist
module.exports.schedulerLoop = scheduleTask = async() => {
    console.log("Scheduled Tasks: ", tasksList)
    if (sitemaps.length == 0) {
        var temp = await master.find()
            .sort({ updatedAt: 1 })
        temp.forEach((item) => { sitemaps.push(item) })
    }
    var sitemap = sitemaps.shift()
    var sitemapURL = sitemap["link"]

    if (!tasksList.includes(sitemapURL)) {
        tasksList.push(sitemapURL)
        console.log('Scheduled ' + sitemapURL + ' to be crawled!')
        setTimeout(scheduleTask, 120000, tasksList);
    } else {
        console.log('Skipping ' + sitemapURL + ' from scheduling!')
        setTimeout(scheduleTask, 60000, tasksList);
    }
}