const mongoose = require('mongoose')
const master = require('../model/master')
const axios = require('axios')
const cron = require('node-cron')

const url = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000";

var control = cron.schedule('00 00 02 * * *', async() => {
    try {
        const sitemaps = await master.find({})
        await Promise.all(sitemaps.map(async(link) => {
            console.log(link["link"])
            const sitemap = link["link"]
            await axios.post(`${url}/algo1`, { url: sitemap })
        }))
    } catch (err) {
        console.log(err)
    }
}, {
    scheduled: true
})

control.start()