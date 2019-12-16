const debug = require('debug')('pamapam');
import * as fs from 'fs';
import * as path from 'path';
import { default as cheerio } from 'cheerio';

import { default as rp } from 'request-promise';

import { parse } from 'json2csv';

const args = require('yargs')
    .alias('f', 'force')
    .boolean('f')
    .describe('f', 'Force to download the assets')
    .alias('o', 'output')
    .default('o', 'pamapam.csv')
    .describe('o', 'Output CSV location')
    .alias('c','cache-dir')
    .describe('c','Directory for cached assets')
    .default('c','.cache')
    .argv;

const FORCE = args.force;
const CACHE_DIR = args.cacheDir;
debug('CLI arguments:')
debug(Object.keys(args).map(k => `     ${k}: ${args[k]}`).join('\r\n'));

async function downloadAsset(url: URL, path: fs.PathLike) {
    if (!fs.existsSync(path) || FORCE) {
        debug('Downloading resource...');
        const resource = await rp(url.href);
        debug('Saving it into disk', path);
        fs.writeFileSync(path, resource);
    }
    return fs.readFileSync(path);
}

type Chincheta = {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    sector: string;
    url: string;
};

type businessPage = { id: string; content: string };

type businessData = {
    id: string;
    tagLine: string;
    criteria: criteriaRating[];
};

type criteriaRating = {
    name: string;
    value: number;
};

function processChincheta(element: CheerioElement): Chincheta {
    const urlEl = element.childNodes.filter(el => el.tagName == 'h4');
    const url = urlEl.length == 1 ? urlEl[0].firstChild.attribs['href'] : '';

    const sectorEls = element.childNodes.filter(el => el.type == 'text');
    let sector = '';
    if (sectorEls.length == 1 && 'data' in sectorEls[0]) {
        if (sectorEls[0].data && typeof sectorEls[0].data === 'string') {
            sector = sectorEls[0].data.trim();
        }
    }

    let id = '';
    if (url) {
        const parts = url.split('/').filter(el => el.length != 0);
        id = parts[parts.length - 1];
    }

    return {
        id,
        title: element.attribs['data-markertitle'],
        latitude: parseFloat(element.attribs['data-markerlat']),
        longitude: parseFloat(element.attribs['data-markerlon']),
        sector,
        url,
    };
}

function getPoints($: CheerioStatic): Chincheta[] {
    debug('Getting points');
    const divs = $('.wpv-addon-maps-marker') as Cheerio;
    if (divs.length == 0) {
        throw new Error('Main DIV not found');
    }
    const results: Chincheta[] = [];
    divs.each((_, element) => {
        results.push(processChincheta(element));
    });
    return results;
}

function getTagLine($: CheerioStatic): string {
    return $('.container > .row > .col-sm-6 > p')
        .first()
        .text();
}

function getCriteria($: CheerioStatic) {
    const criteria: criteriaRating[] = [];
    $('#criteris > li').each((_, el) => {
        const names = el.children.filter(e => e.type == 'text' && e.data && e.data.trim() != '');
        let name = '';

        if (names[0] && names[0].data) {
            name = names[0].data.trim();
        }

        const value = $(el)
            .children('span.badge')
            .children('span')
            .children('span.dashicons-star-filled').length;

        criteria.push({
            name,
            value,
        });
    });

    return criteria;
}

function getBusinessData({ id, content }: businessPage): businessData {
    const $ = cheerio.load(content);
    const tagLine = getTagLine($);
    const criteria = getCriteria($);

    return {
        id,
        tagLine,
        criteria,
    } as businessData;
}

async function downloadBusinessPage(chincheta: Chincheta): Promise<businessPage> {
    const cPath = path.join(CACHE_DIR, chincheta.id + 'html');
    const content = await downloadAsset(new URL(chincheta.url), cPath);
    return {
        ...chincheta,
        content: content.toString(),
    };
}

(async () => {
    // make the cache dir if it not exists
    if (!fs.existsSync(CACHE_DIR)) {
        console.log('Creating the cache directory ".cache"');
        fs.mkdirSync(CACHE_DIR);
    }

    const rootPath = path.join(CACHE_DIR, 'index.html');
    const rootUrl = new URL('https://pamapampv.org/directori-de-punts/');

    const rootContent = await downloadAsset(rootUrl, rootPath);
    const $ = cheerio.load(rootContent);
    const chinchetas = getPoints($);

    const businessHtml = await chinchetas.map(downloadBusinessPage);

    const extendedPointsPromises = await businessHtml.map(async (business: Promise<businessPage>) => {
        const b = await business;
        const extendeData = { ...b, ...getBusinessData(b) };
        delete extendeData.content;
        return extendeData;
    });

    Promise.all(extendedPointsPromises).then(results => {
        const pointsPath = path.join(CACHE_DIR, 'points.json');
        fs.writeFileSync(pointsPath, JSON.stringify(results));

        const fields = ['id', 'title', 'longitude', 'latitude', 'sector', 'url'];
        const opts = { fields };
        const resultStr = parse(results, opts);
        const resultPath = fs.writeFileSync(args.output, resultStr);
        console.log(`Output file generated at ${args.output} with ${results.length} records`);
        debug('Done!');
    });
})();
