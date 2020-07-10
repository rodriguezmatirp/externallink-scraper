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
        return { result: doc }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}