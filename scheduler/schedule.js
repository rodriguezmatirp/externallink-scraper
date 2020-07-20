const mongoose = require('mongoose')
const master = require('../model/master')
const axios = require('axios')
const cron = require('node-cron')

const url = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000";

var control = cron.schedule('00 01 00 * * *', async() => {
    try {
        var now = new Date().toLocaleTimeString()
        console.log('Scheduler works ---' + now)
        const sitemaps = await master.find({})
        for (let sitemap of sitemaps) {
            var sitemap_ = sitemap["link"]
            try {
                await axios.post(`${url}/algo1`, { url: sitemap_ })
            } catch (e) {
                console.log(e + '------------------' + sitemap_)
            }
        }
    } catch (err) {
        console.log(err)
    }
}, {
    scheduled: true
})

control.start()