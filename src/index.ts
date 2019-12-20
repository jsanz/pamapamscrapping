const debug = require('debug')('pamapam');
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

import { scrapping } from './scrapping';

scrapping(args)
