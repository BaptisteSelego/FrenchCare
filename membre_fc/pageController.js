const pageScraper = require('./pageScraper');
const fs = require('fs');
async function scrapeAll(browserInstance){
	let browser;
	try{
		browser = await browserInstance;
		const combinedData = await pageScraper.scraper(browser);
		fs.writeFileSync("data1.json", JSON.stringify(combinedData, null, 2), 'utf8', function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    console.log("The data has been scraped and saved successfully! View it at './data1.json'");
		});	
	}
	catch(err){
		console.log("Could not resolve the browser instance => ", err);
	}
}

module.exports = (browserInstance) => scrapeAll(browserInstance)