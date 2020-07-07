const mondoose = require('mongoose')
const restrictedSchema = require('../model/restricted')
const axios = require('axios')
const articleSchema = require('../model/article')

module.exports.add_ = async(url) => {
    try {
        const main = await new restrictedSchema({ restricted_link: url }).save()
        console.log(main)

        return { result: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

module.exports.get = async() => {
    try {
        const main = await restrictedSchema.find({})
        return { doc: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}