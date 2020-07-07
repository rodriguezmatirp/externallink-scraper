const mongoose = require('mongoose')
const articleSchema = require('../model/article')
const axios = require('axios')
const restrictedSchema = require('../model/restricted')

module.exports.postStatus = async(link_, parent) => {
    try {
        const main = await articleSchema.findOne({ articlelink: parent, "externalLinks.link": link_ })
            // console.log(main)
        var cpy = main
        cpy.externalLinks.forEach((doc) => {
            if (doc.link === link_) {
                doc.status = !(doc.status)
            }
            // console.log(doc)
        })
        const new_ = new articleSchema(cpy)
        const doc = await new_.save()
        var doc_ = []
        doc_.push(doc)
        let filtered = []
        let restrict = await restrictedSchema.find({})
        restrict.forEach((data) => {
            filtered.push(data.restricted_link)
        })
        for (let data of doc_) {
            for (let ext_link of data.externalLinks) {
                for (let fil of filtered) {
                    if (ext_link.link.includes(fil)) {
                        console.log('herrr--------------')
                        console.log(ext_link)
                        delete ext_link.link
                        delete ext_link.rel
                        delete ext_link.status
                        break
                    } else continue
                }
            }
            console.log(data)
        }

        return { result: doc }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}