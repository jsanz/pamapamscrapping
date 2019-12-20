import { debug } from './utils';
import { DownloadArgs, getPointsReport } from './json-download';

const args = require('yargs')
    .alias('f', 'force')
    .boolean('f')
    .default('f', false)
    .describe('f', 'Force to download the assets')
    .alias('o', 'output')
    .default('o', 'pamapam.csv')
    .describe('o', 'Output CSV location')
    .alias('c', 'cache-dir')
    .describe('c', 'Directory for cached assets')
    .default('c', '.cache').argv as DownloadArgs;

const argsType: DownloadArgs = args;

debug('force', argsType.force);
debug('cacheDir', argsType.cacheDir);
debug('output', argsType.output);

getPointsReport(argsType);
