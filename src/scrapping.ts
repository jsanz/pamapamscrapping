const debug = require('debug')('pamapam');

import * as fs from 'fs';
import * as path from 'path';
import { default as cheerio } from 'cheerio';

import { default as rp } from 'request-promise';

import { parse } from 'json2csv';

async function downloadAsset(force: boolean, url: URL, path: fs.PathLike) {
    if (!fs.existsSync(path) || force) {
        debug('Downloading resource...');
        const resource = await rp(url.href);
        debug('Saving it into disk', path);
        fs.writeFileSync(path, resource);
    } else {
        debug('Reusing resource from cache')
    }
    return fs.readFileSync(path);
}

const CRITERIA = [
    'Comerç just',
    'Criteris ecològics',
    'Democràcia interna',
    'Desenvolupament personal',
    'Eficiència energètica',
    'Equitat de gènere',
    'Finances ètiques',
    'Forquilla salarial',
    'Gestió de residus',
    'Integració social',
    'Intercooperació',
    'Participació',
    'Programari Lliure',
    'Proximitat',
    'Transparència'
]

type Business = {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    sector: string;
    url: string;
    tagLine: string;
};

type BusinessContent = {
    id: string,
    content: string
}

function processChincheta(element: CheerioElement): Partial<Business> {
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
        url
    };
}

function getPoints($: CheerioStatic): Partial<Business>[] {
    const divs = $('.wpv-addon-maps-marker') as Cheerio;
    if (divs.length == 0) {
        throw new Error('Main DIV not found');
    }
    const results: Partial<Business>[] = [];
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
    const criteria: { [id: string] : number} = {};
    $('#criteris > li').each((_, el) => {
        const names = el.children.filter(e => e.type == 'text' && e.data && e.data.trim() != '');
        let name = '';

        if (names[0] && names[0].data) {
            name = names[0].data.trim();
        }

        if (CRITERIA.indexOf(name) == -1){
            debug('------------------------------------------>' + name);
        }

        const value = $(el)
            .children('span.badge')
            .children('span')
            .children('span.dashicons-star-filled').length;

        criteria[name] = value;
    });

    return criteria;
}

function getBusinessData(bd:BusinessContent): Partial<Business> {
    debug('Parse business page')
    const $ = cheerio.load(bd.content);
    const tagLine = getTagLine($);
    const criteria = getCriteria($);

    return {
        id: bd.id,
        tagLine,
        ...criteria,
    };
}

async function downloadBusinessPage(cache_dir: string, force: boolean, obj: {id: string, url: string}): Promise<BusinessContent> {
    const cPath = path.join(cache_dir, obj.id + 'html');
    const content = await downloadAsset(force, new URL(obj.url), cPath);
    return {
        id: obj.id,
        content: content.toString(),
    };
}

async function scrapping(args: {force: boolean, cacheDir: string, output: string})  {
    const FORCE = args.force;
    const CACHE_DIR = args.cacheDir;

    // make the cache dir if it not exists
    if (!fs.existsSync(CACHE_DIR)) {
        console.log('Creating the cache directory ".cache"');
        fs.mkdirSync(CACHE_DIR);
    }

    const rootPath = path.join(CACHE_DIR, 'index.html');
    const rootUrl = new URL('https://pamapampv.org/directori-de-punts/');

    debug('Getting the main webpage')
    const rootContent = await downloadAsset(FORCE, rootUrl, rootPath);
    const $ = cheerio.load(rootContent);

    debug('Parsing the main website...');
    const chinchetas = getPoints($);

    debug('For each business process its website...')
    const businessHtml = await chinchetas.map(function(c:Partial<Business>): Promise<BusinessContent> {
        return downloadBusinessPage(CACHE_DIR, FORCE, {id: c.id || '', url: c.url ||  '' });
    });

    // Receive all the HTMLs
    Promise.all(businessHtml).then((results:BusinessContent[])=>{
        const processed = results.map(business => {
            // Get the business data
            const businessBasicData = chinchetas.find((c) => c.id == business.id);
            const businessExtendedData = getBusinessData(business)
            return { ...businessBasicData, ...businessExtendedData} as Business;
        })

        const pointsPath = path.join(CACHE_DIR, 'points.json');
        fs.writeFileSync(pointsPath, JSON.stringify(results));

        const fields = ['id',
                        'title',
                        'longitude',
                        'latitude',
                        'sector',
                        'url'
                    ].concat(CRITERIA);
        const opts = { fields };
        const resultStr = parse(processed, opts);
        fs.writeFileSync(args.output, resultStr);
        console.log(`Output file generated at ${args.output} with ${results.length} records`);
        debug('Done!');
    });
}


export {
    scrapping
}