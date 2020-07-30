const mongoose = require('mongoose')
const master = require('../model/master')

const algo1 = require('../controller/algo1Controller')

const sitemaps = [] // Used to maintain a list of sitemaps
var crawlerFlag = false
var crawlerSkipCounter = 0

module.exports.tasksList = tasksList = []

// Crawler loop crawls URLs from tasklist
module.exports.crawlerLoop = crawler = async() => {
    console.log("Crawler Tasks: ", tasksList)
    if (crawlerFlag) {
        setTimeout(crawler, 10000, task)
        crawlerSkipCounter += 1
        if (crawlerSkipCounter >= 30) {
            crawlerFlag = false
            crawlerSkipCounter = 0
        }
        return
    }
    var tasksLength = tasksList ? tasksList.length : 0;
    if (tasksLength !== 0 && tasksList !== undefined) {
        var taskURL = tasksList.shift()
        try {
            crawlerFlag = true
            setTimeout(crawler, 20000, tasksList);
            await algo1.algo1({ body: { url: taskURL } })
            crawlerFlag = false
            console.log('Crawled ' + taskURL + ' - from CrawlerLoop')
        } catch (e) {
            console.log("Crawler Error for  : ", taskURL + " " + e)
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
    if (sitemap !== undefined) {
        var sitemapURL = sitemap["link"]
    } else {
        console.log('No websites to schedule')
        setTimeout(scheduleTask, 240000, this.tasksList)
    }
    if (!tasksList.includes(sitemapURL)) {
        tasksList.push(sitemapURL)
        console.log('Scheduled ' + sitemapURL + ' to be crawled!')
        setTimeout(scheduleTask, 60000, tasksList);
    } else {
        console.log('Skipping ' + sitemapURL + ' from scheduling!')
        setTimeout(scheduleTask, 30000, tasksList);
    }
}