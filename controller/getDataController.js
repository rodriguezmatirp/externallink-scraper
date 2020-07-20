const mongoose = require("mongoose");
const articleSchema = require("../model/article");
const sitemapSchema = require("../model/sitemap");
const restrictedSchema = require('../model/restricted')

module.exports.get = async(link, type, start, end, skip, limit) => {
    try {
        var condition = {}
        if (link) {
            condition["main_link"] = link
        }

        start = new Date(start)
        end = new Date(end)
        end = await incrementDate(end, 1)

        let start_flag = (start.getTime() === start.getTime())
        let end_flag = (end.getTime() === end.getTime())

        if (start_flag || end_flag) {
            condition["lastmod"] = {}
            if (start_flag) {
                condition["lastmod"]["$gte"] = start
            }
            if (end_flag) {
                condition["lastmod"]["$lte"] = end
            }
        }
        console.log(condition)
        var doc = await articleSchema
            .find(condition)
            .sort({ lastmod: 'desc' })
        const result = await filterProcess(doc, type)

        return result
    } catch (e) {
        console.log(e)
    }
}


const filterProcess = async(doc, type) => {
    let filtered_all = []
    let filtered_est = []

    var restrict = await restrictedSchema.find()

    restrict.forEach((data) => {
        if (data.restricted_type === "EST") {
            filtered_est.push(data.restricted_link)
        } else {
            filtered_all.push(data.restricted_link)
        }
    })
    for (let data of doc) {
        for (let ext_link of data.externalLinks) {
            for (let fil of filtered_all) {
                if (ext_link.link.includes(fil)) {
                    console.log('Filtering')
                    delete ext_link.link
                    delete ext_link.rel
                    delete ext_link.status
                    break
                } else continue
            }
        }
    }
    for (let data of doc) {
        if (data.main_link.includes("startuptalky.com/sitemap.xml")) continue
        else {
            for (let ext_link of data.externalLinks) {
                for (let fil of filtered_est) {
                    if (ext_link.link) {
                        if (ext_link.link.includes(fil)) {
                            console.log('Filtering')
                            delete ext_link.link
                            delete ext_link.rel
                            delete ext_link.status
                            break
                        } else continue
                    }
                }
            }
        }
    }
    //Filtering ends

    let unfilteredResult = doc;

    for (let i = 0; i < unfilteredResult.length; i++) {
        var filterExt = []
        for (let data of unfilteredResult[i].externalLinks) {
            if (data.link === undefined) continue
            else {
                if (type === "dofollow") {
                    if (data.rel === undefined || data.rel === "dofollow") {
                        filterExt.push(data)
                    }
                } else if (type === "nofollow") {
                    if (data.rel !== undefined && data.rel !== "dofollow") {
                        filterExt.push(data)
                    }
                } else {
                    filterExt.push(data)
                }
            }
        }
        unfilteredResult[i].externalLinks = filterExt
    }
    let filtered = []

    for (let i = 0; i < unfilteredResult.length; i++) {
        if (unfilteredResult[i].externalLinks.length == 0) continue;
        else filtered.push(unfilteredResult[i]);
    }

    return filtered
}

incrementDate = async(dateInput, increment) => {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(
        dateFormatTotime.getTime() + increment * 86400000
    );
    return increasedDate;
};