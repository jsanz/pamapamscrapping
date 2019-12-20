import * as fs from 'fs';
import { default as rp } from 'request-promise';
import * as debugP from 'debug';
const debug = debugP.debug('pamapam');

async function downloadAsset(force: boolean, url: URL, path: fs.PathLike): Promise<Buffer> {
    if (!fs.existsSync(path) || force) {
        console.log('Downloading resource at ', path);
        const resource = await rp(url.href);
        fs.writeFileSync(path, resource);
    } else {
        debug('Reusing resource from cache');
    }
    return fs.readFileSync(path);
}

export { debug, downloadAsset };
