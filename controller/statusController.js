require('mongoose')
const linksSchema = require('../model/links')

//update the status property in Links schema 
module.exports.postStatus = async(linkId, status) => {
    try {
        await linksSchema.findByIdAndUpdate({ _id: linkId }, { status: status })
        return { status: true }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}