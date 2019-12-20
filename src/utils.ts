import * as fs from 'fs';
import { default as rp } from 'request-promise';
import * as debugP from 'debug';
const debug = debugP.debug('pamapam');

async function downloadAsset(force: boolean, url: URL, path: fs.PathLike): Promise<Buffer> {
    if (!fs.existsSync(path) || force) {
        debug('Downloading resource...');
        const resource = await rp(url.href);
        debug('Saving it into disk', path);
        fs.writeFileSync(path, resource);
    } else {
        debug('Reusing resource from cache');
    }
    return fs.readFileSync(path);
}

export { debug, downloadAsset };
