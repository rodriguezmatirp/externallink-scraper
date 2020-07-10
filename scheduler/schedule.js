const mongoose = require('mongoose')
const master = require('../model/master')
const axios = require('axios')
const cron = require('node-cron')

const url = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000";

var control = cron.schedule('00 30 21 * * *', async() => {
    try {
        console.log('-----------------------------------------------------')
        const sitemaps = await master.find({})
            // await Promise.all(sitemaps.map(async(link) => {
            //     console.log(link["link"])
            //     const sitemap = link["link"]
            //     const res = await axios.post(`${url}/algo1`, { url: sitemap })
            // }))

        var flag = false
        var i = 0
        while (!flag && i < sitemaps.length) {
            const sitemap = sitemaps[i]["link"]
            const res = await axios.post(`${url}/algo1`, { url: sitemap })
            if (res.status) {
                flag = false
                i++
            }
        }
    } catch (err) {
        console.log(err)
    }
}, {
    scheduled: true
})

control.start()