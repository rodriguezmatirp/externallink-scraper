const mongoose = require('mongoose')
const linksSchema = require('../model/links')
const sitemapSchema = require('../model/sitemap')
const domainSchema = require('../model/domain')
const articleSchema = require('../model/article')
const externalLinkSchema = require('../model/externalLink')

const util = require('util')
const axios = require('axios')
const cheerio = require('cheerio');


// (async() => {
//     try {
//         const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test'
//         const con = await mongoose.connect(mongoUri, {
//             useFindAndModify: false,
//             useNewUrlParser: true,
//             useCreateIndex: true,
//             useUnifiedTopology: true,
//             poolSize: 2
//         });
//         if (con) {
//             console.log(`crawlWorker[${process.pid}]: Connected Successful to the Database!`);
//         }
//     } catch (err) {
//         console.log(`crawlWorker[${process.pid}]: Not Connected to Database due to Error : ${err}`);
//     }
// })();


const blockedSocialMediaLinks = [
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "youtube.com",
    "telegram.org",
    "t.me",
    "instagram.com",
    "amazon.com",
    "amazon.in",
    "flipkart.com"
]



module.exports.scrapeSitemap = scrapeSitemap = async(sitemapUrl, domainId, parentSitemapId = undefined, lastModified = Date.now()) => {
    console.log("Sitemap URL: ", sitemapUrl)
    console.log("DOmainID URL: ", domainId)
    if (!sitemapUrl) {
        throw Error("The URL is undefined")
    } else if (sitemapUrl.lastIndexOf(".xml", -5) != -1)
        throw Error("Not a Sitemap URL")
            //else if()

    try {
        response = await getpageContent(sitemapUrl)
        console.log(`Parsing Sitemap: ${sitemapUrl}`)
        var result = cheerioSitemapParser(response)

        var parsedSitemapLinks = result[0]
        var parsedArticleLinks = result[1]

        console.log(`${sitemapUrl} has ${parsedSitemapLinks.length} sitemaps and  ${parsedArticleLinks.length} articles`)
    } catch (err) {
        console.error(`ScrapeSitemap Error: Stopped Scrapping ${sitemapUrl} due to : ${err}`)
        if (parentSitemapId == undefined) {
            try {
                await domainSchema.findOneAndUpdate({ domainSitemap: sitemapUrl }, { blocked: true })
                throw new Error(`ScrapeSitemap: Blocked domainSitemap - ${sitemapUrl}`)
            } catch (e) {
                throw new Error(`ScrapeSitemap: Can't find domainSitemap - ${sitemapUrl} to block in domainSchema`)
            }
        }
    }

    let sitemapDataFromDB = await sitemapSchema.find({ sitemapLink: sitemapUrl })
    if (sitemapDataFromDB.length != 0) {
        sitemapDBData = sitemapDataFromDB[0]
    } else {
        try {
            sitemapDBData = new sitemapSchema({
                domainId: domainId,
                parentSitemapId: parentSitemapId,
                sitemapLink: sitemapUrl,
                disabled: false,
                lastModified: new Date(0)
            })
            sitemapDBData = await sitemapDBData.save()
            await domainSchema.findOneAndUpdate({ _id: domainId }, { $inc: { subSitemapCount: 1 } })
        } catch (e) {
            console.log(`ScrapeSitemap MongoDB error while saving ${sitemapUrl} under sitemapID: ${parentSitemapId} : ${e}`)
        }
    }

    var scrapeTasks = []

    if (parsedSitemapLinks.length != 0) {
        subSitemapsDBData = await sitemapSchema.find({ parentSitemapId: sitemapDBData._id }, { blocked: false })
        for (let sitemapObj of parsedSitemapLinks) {
            var shouldScrape = true;
            for (let subSitemapDbData of subSitemapsDBData) {
                if (subSitemapDbData.sitemapLink === sitemapObj[0] && subSitemapDbData.lastModified >= sitemapObj[1]) {
                    shouldScrape = false;
                    break;
                }
            }

            if (shouldScrape) {
                try {
                    await scrapeSitemap(sitemapObj[0], domainId, sitemapDBData._id, sitemapObj[1])
                } catch (err) {
                    console.error(`ScrapeSitemap Error: Blocking ${articleObj[0]} from sitemapID: ${sitemapDBData._id} : ${err}`)
                    await sitemapSchema.findOneAndUpdate({ sitemapLink: sitemapObj[0] }, { blocked: true })
                }
            }
        }
    }

    if (parsedArticleLinks.length != 0) {
        articleLinksData = await articleSchema.find({ sitemapId: sitemapDBData._id }, { blocked: false })
        for (let articleObj of parsedArticleLinks) {
            var shouldScrape = true;
            for (let articleDbData of articleLinksData) {
                if (articleDbData.articleLink === articleObj[0] && articleDbData.lastModified >= articleObj[1]) {
                    shouldScrape = false;
                    break;
                }
            }

            if (shouldScrape) {
                try {
                    await scrapeArticle(articleObj[0], domainId, sitemapDBData._id, articleObj[1])
                } catch (err) {
                    console.error(`ScrapeArticle Error: Blocking ${articleObj[0]} from sitemapID: ${sitemapDBData._id} : ${err}`)
                    await articleSchema.findOneAndUpdate({ articleLink: articleObj[0] }, { blocked: true })
                }
            }
        }

    }

    // Updating the lastModified value
    await sitemapSchema.findByIdAndUpdate({ _id: sitemapDBData._id }, { lastModified: lastModified })

    return domainId
}


const cheerioSitemapParser = function(pageContent) {
    const $ = cheerio.load(pageContent, { xmlMode: true })

    const sitemaps = $('sitemap')
    const articleLinks = $('url')

    const parsedArticleLinks = []
    const parsedSitemapLinks = []

    // needs improvement- use a generic function to do both
    sitemaps.each(function(index, e) {
        var location = $(this).find('loc').text()
        var lastModified = new Date($(this).find('lastmod').text())

        if (isNaN(lastModified.getTime()))
            lastModified = Date.now()

        linkData = [location, lastModified]
        parsedSitemapLinks.push(linkData)
    })

    console.log("Sitemap-cheerio length: ", sitemaps.length)

    articleLinks.each(function(index, e) {
        var location = $(this).find('loc').text()
        var lastModified = new Date($(this).find('lastmod').text())

        if (isNaN(lastModified.getTime()))
            lastModified = Date.now()

        linkData = [location, lastModified]
        parsedArticleLinks.push(linkData)
    })

    console.log('Article-cheerio length : ', articleLinks.length)

    return [parsedSitemapLinks, parsedArticleLinks]
}



const validateUrl = (pageDomain, hyperLinkUrl) => {


    if (hyperLinkUrl.includes(pageDomain) || // Filter links to same domain
        // Legacy code - needs checking
        // /^#.*/.test(hyperLinkUrl) ||
        // hyperLinkUrl === '' ||
        // hyperLinkUrl.charAt(0) === "/" || 
        // hyperLinkUrl.indexOf('mailto') === 0 || 
        // hyperLinkUrl.includes("javascript:void") || 
        hyperLinkUrl.includes("share.hsforms.com") ||
        blockedSocialMediaLinks.some(function(string) { return hyperLinkUrl.includes(string) })
    )
        return false
    return true
}

const cheerioArticleParser = function(pageUrl, pageContent) {
    const pageDomainRegex = pageUrl.match(/(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}/)
    const pageDomain = pageDomainRegex[0].toLowerCase() // Lower to filter domains with capital letters
    const $ = cheerio.load(pageContent)

    const hyperLinks = $('a').filter(function(index, e) {
        var hyperLinkUrl = $(this).attr('href') ?
            $(this).attr('href').toLowerCase() : '';
        return validateUrl(pageDomain, hyperLinkUrl)
    })
    const parsedHyperLinks = []

    hyperLinks.each(function(index, e) {
        var unparsedLink = $(this).attr('href') ? $(this).attr('href') : ''
        var parsedLinkRegex = unparsedLink.match(/^(https?:\/\/){0,1}(www\.)?[-a-zA-Z0-9:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(\/[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/)
        if (parsedLinkRegex) {

            var parsedLink = parsedLinkRegex[0]

            if (parsedLink.endsWith('/'))
                parsedLink = parsedLink.slice(0, -1)

            var rel = 'dofollow'
            if ($(this).attr('rel') !== undefined && $(this).attr('rel').includes("nofollow"))
                rel = 'nofollow'

            var anchorText = $(this).text()

            while (/<img.*>/.test(anchorText) === true) {
                var altText = /<img.*?[alt="(.*?)" | alt='(.*?)'].*>/g.exec(anchorText)[1]
                anchorText = anchorText.replace(/<img.*?[alt="(.*?)" | alt='(.*?)'].*>/, ` ${altText} `)
            }
            anchorText = anchorText.trim()

            linkData = [parsedLink, rel, anchorText]
            parsedHyperLinks.push(linkData)
        }
    })

    return parsedHyperLinks
}

const scrapeArticle = async(articleUrl, domainId, parentSitemapId, lastModified = Date.now()) => {
    if (!articleUrl) {
        throw Error("The URL is undefined")
    }

    try {
        response = await getpageContent(articleUrl)
            //console.log(`Parsing Article: ${articleUrl} from sitemapId : ${parentSitemapId}`)
        var parsedHyperlinks = cheerioArticleParser(articleUrl, response)
            // console.log(`Parsed ${parsedHyperlinks.length} links from ${articleUrl}`)
    } catch (err) {
        throw Error(`Stopped Scrapping Article ${articleUrl} from sitemapId - ${parentSitemapId} due to :\n${err}`)
    }

    let articleDataFromDB = await articleSchema.find({ articleLink: articleUrl })
    if (articleDataFromDB.length != 0) {
        articleDBData = articleDataFromDB[0]
    } else {
        try {
            articleDBData = new articleSchema({
                domainId: domainId,
                sitemapId: parentSitemapId,
                articleLink: articleUrl,
                disabled: false,
                lastModified: lastModified,
                domainId: domainId
            })
            articleDBData = await articleDBData.save()
            await domainSchema.findOneAndUpdate({ _id: domainId }, { $inc: { websiteCount: 1 } })
        } catch (e) {
            console.log(`ScrapeArticle MongoDB error while saving ${articleUrl} under sitemapID: ${parentSitemapId} : ${e}`)
        }
    }

    if (parsedHyperlinks.length != 0) {
        externalLinksData = await linksSchema.find({ articleId: articleDBData._id })
        for (let parsedLinkData of parsedHyperlinks) {
            var [parsedLink, rel, anchorText] = parsedLinkData
            var shouldAdd = true;
            for (let link of externalLinksData) {
                if (link.externalLink === parsedLink) {
                    shouldAdd = false;
                    break;
                }
            }

            if (shouldAdd) {
                console.log(`Found new External Link - "${parsedLink}" from Article - ${articleUrl}`)

                externalLinkData = new linksSchema({
                    domainId: domainId,
                    articleId: articleDBData._id,
                    externalLink: parsedLink,
                    rel: rel,
                    anchorText: anchorText,
                })
                try {
                    externalLinkData = await externalLinkData.save()
                } catch (e) {
                    console.log('Error saving externalLinks to db ' - parsedLink)
                }
                await saveUniqueExtLink(parsedLink, anchorText, rel, articleUrl, lastModified, domainId)
            }
        }
    }

    return parsedHyperlinks
}

const saveUniqueExtLink = async(title, text, rel, article_link, lastmod, domainId) => {
    if (title !== null || title !== undefined) {
        var externalLink_ = title.match(/(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))/)
        if (externalLink_) {
            try {
                if (rel === undefined) {
                    rel = "dofollow"
                } else if (rel.includes("nofollow")) {
                    rel = "nofollow"
                }
                var newLink = new externalLinkSchema({
                    domainId: domainId,
                    externalLink: externalLink_[0],
                    articleLink: article_link,
                    lastModified: lastmod,
                    rel: rel,
                    externalUrl: title,
                    anchorText: text
                })
                await newLink.save()
                console.log('Adding external link ' + externalLink_[0])
            } catch (e) {
                if (e.code === 11000) {
                    await externalLinkSchema.findOneAndUpdate({ externalLink: externalLink_ }, { $inc: { externalLinkCount: 1 } })
                } else {
                    console.log('Error : website ---' + externalLink_[0] + e)
                }
            }
        }
    }
}


const getpageContent = async(url, noOfTries) => {
    if (isNaN(noOfTries) || noOfTries < 1)
        noOfTries = 5


    var error = null
    for (let i = 0; i < noOfTries; i++) {
        try {
            const result = await axios.get(url);
            // console.log('Page Loading Success ! - ' + url)
            return result.data;
        } catch (err) {
            error = err
            console.log(`Request Retry Attempt Number: ${i + 1} ====> URL: ${url}`);
        }
    }
    throw error;
}


// scrapeSitemap('https://renovate.home.blog/sitemap.xml', '5f3ea8fd0be8d22e8c0d0345')