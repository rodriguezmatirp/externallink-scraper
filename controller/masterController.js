const mongoose = require('mongoose');
const masterSchema = require('../model/master');


module.exports.insert = async (req) => {
    const master = new masterSchema(req.body);
    const doc = await master.save()
    return (doc);
}
module.exports.getAll = async () => {

    const doc =await masterSchema.find();
    return (doc);
}