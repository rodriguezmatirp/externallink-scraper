require("mongoose");
const articleSchema = require("../model/article");
const linksSchema = require("../model/links");
const domainSchema = require("../model/domain");

// Generic get function used for Website wise and Date wise pages
module.exports.get = async(link, type, start, end, skip, limit) => {
    try {
        // Objects to store conditions to filter tha data
        const articleCondition = {};
        const linksCondition = { articleId: [], isHidden: false };

        // Input sanitization
        skip = Number(skip) ? Number(skip) : 0;
        limit = Number(limit) ? Number(limit) : 20;
        start = new Date(start);
        end = new Date(end);
        end = await incrementDate(end, 1);

        // For getting a links of a specific domian
        if (link) {
            const domain = await domainSchema.findOne({ domainSitemap: link });
            articleCondition["domainId"] = domain._id;
        }

        // Limit the time scope of the time
        if (!isNaN(start.getTime()) || !isNaN(end.getTime())) {
            articleCondition["lastModified"] = {};
            if (!isNaN(start.getTime()))
                articleCondition["lastModified"]["$gte"] = start;
            if (!isNaN(end.getTime())) articleCondition["lastModified"]["$lte"] = end;
        }

        // Set the type to filter is specifed else return all
        if (type === "dofollow" || type === "nofollow")
            linksCondition["rel"] = type;

        // Getting the required article objects since limiting and sorting the links is based on that
        const articleObjs = {};
        const articles = await articleSchema.find(articleCondition);

        // Store it in a easily accessible format
        articles.forEach((articleObj) => {
            linksCondition.articleId.push(articleObj._id);
            articleObjs[articleObj._id] = [
                articleObj.articleLink,
                articleObj.lastModified,
            ];
        });

        // Get the total links count matching the condition for front-end Pagination
        const linksCount = await linksSchema.find(linksCondition).count();

        // Get the required count of linksObjects matching the condition
        const externalLinks = await linksSchema
            .find(linksCondition, { isHidden: false })
            .skip(skip)
            .limit(limit);

        // Add the rrequired extra properties
        const propertyAddedExternalLinks = [];
        for (let externalLinkObj of externalLinks) {
            const [articleLink, lastModified] = articleObjs[
                externalLinkObj["articleId"]
            ];

            propertyAddedExternalLinks.push({
                _id: externalLinkObj["_id"],
                articleLink: articleLink,
                lastModified: lastModified,
                externalLink: externalLinkObj["externalLink"],
                anchorText: externalLinkObj["anchorText"],
                status: externalLinkObj["status"],
                rel: externalLinkObj["rel"],
            });
        }

        // sort based on lastModified
        propertyAddedExternalLinks.sort((objA, objB) =>
            objA.lastModified < objB.lastModified ? -1 : 1
        );

        return { externalLinks: propertyAddedExternalLinks, totalCount: linksCount };
    } catch (error) {
        console.error(error);
    }
};

// Function to increase date by a constant (24hrs  == 86400000ms)
incrementDate = async(dateInput, increment) => {
    const dateFormatToTime = new Date(dateInput);
    return new Date(dateFormatToTime.getTime() + increment * 86400000);
};