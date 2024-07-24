const scraperObject = {
    url: 'https://www.lafrenchcare.fr/nos-membres/',
    async scraper(browser) {
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        await page.goto(this.url);

        const acceptButton = 'button#popin_tc_privacy_button_3.tc-reset-css.tc-privacy-button[title="Tout accepter"]';
        await page.waitForSelector(acceptButton);
        await page.click(acceptButton);
        let allData = [];
        let hasNext = true;

        while (hasNext) {
            const data = await page.evaluate(() => {
                const containerElements = document.querySelectorAll('.wp-grid-builder.wpgb-enabled .wpgb-card');
                return Array.from(containerElements).map(container => {
                    const detailsElement = container.querySelector('.section-directory__details');
                    const detailsText = detailsElement ? detailsElement.innerText.split('\n') : [];
                    const title = detailsText.length > 1 ? detailsText[0].trim() : 'Text not found';
                    const city = detailsText.length > 1 ? detailsText[1].trim() : 'Text not found';
                    const name = detailsText.length > 1 ? detailsText[2].trim() : 'Text not found';
                    const fonction = detailsText.length > 1 ? detailsText[3].trim() : 'Text not found';
                    const linkElement = container.querySelector('a');
                    const link = linkElement ? linkElement.href : 'Link not found';
                    return {
                        title,
                        city,
                        name,
                        fonction,
                        link
                    };
                });
            });
            allData = allData.concat(data);

            hasNext = await page.evaluate(() => {
                const pageItems = document.querySelectorAll('li.wpgb-page');
                const lastPageItem = pageItems[pageItems.length - 1];
                const lastPageLink = lastPageItem ? lastPageItem.querySelector('a') : null;
                if (lastPageLink && lastPageLink.getAttribute('aria-current') !== 'true') {
                    lastPageLink.click();
                    return true;
                } else {
                    return false;
                }
            });

            if (hasNext) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        for (const item of allData) {
            if (item.link !== 'N/A') {
                console.log(`Opening new tab for ${item.link}`);
                try {
                    const newPage = await browser.newPage();
                    await newPage.goto(item.link, { waitUntil: 'networkidle2' });

                    const info = await newPage.evaluate(() => {
                        const summaryElement = document.querySelector('ul.section-member-card__summary');

                        const findElementByStrongText = (text) => {
                            return summaryElement ? Array.from(summaryElement.querySelectorAll('li')).find(li => li.querySelector('strong') && li.querySelector('strong').textContent.trim() === text) : null;
                        };

                        const addressElement = findElementByStrongText('Adresse');
                        const address = addressElement ? addressElement.textContent.replace('Adresse', '').trim() : 'Address not found';

                        const sectorElement = findElementByStrongText('Secteur');
                        const sector = sectorElement ? sectorElement.textContent.replace('Secteur', '').trim() : 'Sector not found';

                        const categorieElement = findElementByStrongText('Catégorie');
                        const categorie = categorieElement ? categorieElement.textContent.replace('Catégorie', '').trim() : 'Category not found';

                        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                        const bodyText = document.body.innerText;
                        const allEmails = bodyText.match(emailPattern) || [];
                        let emailAddress = allEmails.length > 0 ? allEmails[0] : 'NA';

                        const presentationElement = document.querySelector('.section-member-card__presentation p');
                        const presentation = presentationElement ? presentationElement.innerText.trim() : 'Presentation not found';

                        const siteWebElement = Array.from(document.querySelectorAll('a.block-link')).find(a => a.textContent.trim() === 'Site web');
                        const siteWeb = siteWebElement ? siteWebElement.href : 'Site web not found';

                        return {
                            address,
                            sector,
                            categorie,
                            email: emailAddress,
                            presentation,
                            siteWeb
                        };
                    });

                    item.address = info.address;
                    item.sector = info.sector;
                    item.categorie = info.categorie;
                    item.email = info.email;
                    item.presentation = info.presentation;
                    item.siteWeb = info.siteWeb;

                    await newPage.close();

                    if (item.email === 'NA' && item.siteWeb !== 'Site web not found') {
                        console.log(`Navigating to ${item.siteWeb} to re-attempt email detection.`);
                        const newTab = await browser.newPage();
                        await newTab.goto(item.siteWeb, { waitUntil: 'networkidle2' });

                        const newInfo = await newTab.evaluate(() => {
                            const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                            const bodyText = document.body.innerText;
                            const allEmails = bodyText.match(emailPattern) || [];
                            const emailAddress = allEmails.length > 0 ? allEmails[0] : 'NA';
                            return emailAddress;
                        });

                        item.email = newInfo;
                        await newTab.close();
                    }
                } catch (error) {
                    console.error(`Failed to open ${item.link}: ${error.message}`);
                    item.email = 'NA';
                    item.address = 'Address not found';
                    item.sector = 'Sector not found';
                    item.categorie = 'Category not found';
                    item.presentation = 'Presentation not found';
                }
            } else {
                item.email = 'NA';
                item.address = 'Address not found';
                item.sector = 'Sector not found';
                item.categorie = 'Category not found';
                item.presentation = 'Presentation not found';
            }
        }

        return allData;
    }
};

module.exports = scraperObject;
