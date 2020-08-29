require('mongoose')
const linksSchema = require('../model/links')
const sitemapSchema = require('../model/sitemap')
const domainSchema = require('../model/domain')
const articleSchema = require('../model/article')
const externalLinkSchema = require('../model/externalLink')

const axios = require('axios')
const cheerio = require('cheerio');

const blockedDomains = [
    "facebook.com/",
    "twitter.com/",
    "linkedin.com/",
    "youtube.com/",
    "telegram.org/",
    "t.me/",
    "instagram.com/",
    "amazon.com/",
    "amazon.in/",
    "flipkart.com/",
    'https://in.makers.yahoo.com/',
    'https://plus.sandbox.google.com/',
    'http://www.shutterstock.com/',
    'https://t.co/',
    'https://play.google.com/',
    'https://en.wikipedia.org/',
    'https://medium.com/',
    'https://itunes.apple.com/',
    'http://t.co/',
    'https://appsto.re/',
    'https://www.shutterstock.com/',
    'https://www.bloomberg.com/',
    'https://www.flickr.com/',
    'http://amzn.to/',
    'http://www.bbc.com/',
    'https://www.entrepreneur.com/',
    'http://techcrunch.com/',
    'https://www.nytimes.com/',
    'https://hbr.org/',
    'http://fortune.com/',
    'https://pixabay.com/',
    'http://en.wikipedia.org/',
    'https://www.ted.com/',
    'https://angel.co/',
    'docs.google.com/',
    'spotify.com/',
    'reddit.com/',
    'pinterest.com/'
]


const getPageContent = async(url, noOfTries) => {
    if (isNaN(noOfTries) || noOfTries < 1)
        noOfTries = 5
    let error = null;
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

const cheerioSitemapParser = function(pageContent) {
    const $ = cheerio.load(pageContent, { xmlMode: true })

    const sitemaps = $('sitemap')
    const articleLinks = $('url')

    const parsedArticleLinks = []
    const parsedSitemapLinks = []

    // needs improvement- use a generic function to do both
    sitemaps.each(function() {
        const location = $(this).find('loc').text();
        let lastModified = new Date($(this).find('lastmod').text());

        if (isNaN(lastModified.getTime()))
            lastModified = Date.now()

        const linkData = [location, lastModified]
        parsedSitemapLinks.push(linkData)
    })

    console.log("Sitemap-cheerio length: ", sitemaps.length)

    articleLinks.each(function() {
        const location = $(this).find('loc').text()
        let lastModified = new Date($(this).find('lastmod').text())

        if (isNaN(lastModified.getTime()))
            lastModified = Date.now()

        if (!location.includes('/tag/')) {
            const linkData = [location, lastModified]
            parsedArticleLinks.push(linkData)
        }
    })
    console.log('Article-cheerio length : ', articleLinks.length)

    return [parsedSitemapLinks, parsedArticleLinks]
}

const cheerioArticleParser = function(pageUrl, pageContent) {
    const pageDomainRegex = pageUrl.match(/(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}/)
    const pageDomain = pageDomainRegex[0].toLowerCase() // Lower to filter domains with capital letters
    const $ = cheerio.load(pageContent)

    const hyperLinks = $('a').filter(function() {
        const hyperLinkUrl = $(this).attr('href') ? $(this).attr('href').toLowerCase() : '';
        return !(
            hyperLinkUrl.includes(pageDomain) ||
            hyperLinkUrl.includes("share.hsforms.com") ||
            blockedDomains.some(string => hyperLinkUrl.includes(string)))
    })
    const parsedHyperLinks = []

    hyperLinks.each(function() {
        const unparsedLink = $(this).attr('href') ? $(this).attr('href') : ''
        const parsedLinkRegex = unparsedLink.match(/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(\/[-a-zA-Z0-9()@:%_+.~#?&\/=]*)/)
        if (parsedLinkRegex) {

            let parsedLink = parsedLinkRegex[0]

            if (parsedLink.endsWith('/'))
                parsedLink = parsedLink.slice(0, -1)

            let rel = 'dofollow';
            if ($(this).attr('rel') !== undefined && $(this).attr('rel').includes("nofollow"))
                rel = 'nofollow'

            let anchorText = $(this).text();

            while (/<img.*>/.test(anchorText) === true) {
                const altTextObj = /<img.*? alt=["'](.*?)["'].*>/g.exec(anchorText);
                if (altTextObj === undefined || altTextObj === null)
                    break
                anchorText = anchorText.replace(/<img.*?alt=["'](.*?)["'].*>/, ` ${altTextObj[1]} `)
            }
            anchorText = anchorText.trim()

            const linkData = [parsedLink, rel, anchorText]
            parsedHyperLinks.push(linkData)
        }
    })
    return parsedHyperLinks
}

const scrapeSitemap = async(sitemapUrl, domainId, parentSitemapId = undefined, lastModified = Date.now()) => {
    console.log("Sitemap URL: ", sitemapUrl)
    console.log("Domain Id: ", domainId)

    if (!sitemapUrl) {
        throw Error("The URL is undefined")
    }

    const pageContent = await getPageContent(sitemapUrl)
    const [parsedSitemapLinks, parsedArticleLinks] = cheerioSitemapParser(pageContent)
    console.log(`${sitemapUrl} has ${parsedSitemapLinks.length} sitemaps and  ${parsedArticleLinks.length} articles`)

    let sitemapDBData = await sitemapSchema.findOne({ sitemapLink: sitemapUrl })
    if (sitemapDBData === null || sitemapDBData === undefined) {
        sitemapDBData = new sitemapSchema({
            domainId: domainId,
            parentSitemapId: parentSitemapId,
            sitemapLink: sitemapUrl,
            disabled: false,
            lastModified: new Date(0)
        })
        sitemapDBData = await sitemapDBData.save()
        await domainSchema.findOneAndUpdate({ _id: domainId }, { $inc: { subSitemapCount: 1 } })
    }

    let shouldScrape;
    if (parsedSitemapLinks.length > 0) {
        const subSitemapsDBData = await sitemapSchema.find({ parentSitemapId: sitemapDBData._id }, { blocked: false })
        for (let sitemapObj of parsedSitemapLinks) {
            shouldScrape = true;
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
                    console.error(`ScrapeSitemap Error: Blocking ${sitemapObj[0]} from sitemapID: ${sitemapDBData._id} : ${err}`)
                    await sitemapSchema.findOneAndUpdate({ sitemapLink: sitemapObj[0] }, { blocked: true })
                }
            }
        }
    }

    if (parsedArticleLinks.length > 0) {
        const articleLinksData = await articleSchema.find({ sitemapId: sitemapDBData._id })
        for (let articleObj of parsedArticleLinks) {
            shouldScrape = true;
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
    return sitemapUrl
}


const scrapeArticle = async(articleUrl, domainId, parentSitemapId, lastModified = Date.now()) => {
    if (!articleUrl) {
        throw Error("The URL is undefined")
    }

    const pageContent = await getPageContent(articleUrl)
    const parsedHyperlinks = cheerioArticleParser(articleUrl, pageContent)

    let articleDBData = await articleSchema.findOne({ articleLink: articleUrl })
    if (articleDBData === null || articleDBData === undefined) {
        articleDBData = new articleSchema({
            domainId: domainId,
            sitemapId: parentSitemapId,
            articleLink: articleUrl,
            disabled: false,
            lastModified: lastModified,
        })
        articleDBData = await articleDBData.save()
        await domainSchema.findOneAndUpdate({ _id: domainId }, { $inc: { websiteCount: 1 } })

    }

    if (parsedHyperlinks.length > 0) {
        const externalLinksData = await linksSchema.find({ articleId: articleDBData._id })
        for (let parsedLinkData of parsedHyperlinks) {
            const [parsedLink, rel, anchorText] = parsedLinkData;
            let shouldAdd = true;
            for (let link of externalLinksData) {
                if (link.externalLink === parsedLink) {
                    shouldAdd = false;
                    break;
                }
            }

            if (shouldAdd) {
                console.log(`Found new External Link - "${parsedLink}" from Article - ${articleUrl}`)

                const externalLinkData = new linksSchema({
                    domainId: domainId,
                    articleId: articleDBData._id,
                    externalLink: parsedLink,
                    rel: rel,
                    anchorText: anchorText,
                })
                try {
                    await externalLinkData.save()
                } catch (e) {
                    console.log('Error saving externalLinks to db ' - parsedLink)
                }
                await saveUniqueExtLink(parsedLink, anchorText, rel, articleUrl, lastModified, domainId)
            }
        }
    }
    return articleUrl
}

const saveUniqueExtLink = async(title, text, rel, article_link, lastmod, domainId) => {
    if (title !== null) {
        const externalLink_ = title.match(/(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))/);
        if (externalLink_) {
            try {
                if (rel === undefined) {
                    rel = "dofollow"
                } else if (rel.includes("nofollow")) {
                    rel = "nofollow"
                }
                const newLink = new externalLinkSchema({
                    domainId: domainId,
                    externalLink: externalLink_[0],
                    articleLink: article_link,
                    lastModified: lastmod,
                    rel: rel,
                    externalUrl: title,
                    anchorText: text
                });
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

module.exports.scrapeSitemap = scrapeSitemap

// scrapeArticle('http://localhost/bs_ci/startups/organization-type/one-person-company', '0947238776')