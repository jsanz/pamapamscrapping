import { Client } from '@elastic/elasticsearch';
import { debug } from './utils';
import * as fs from 'fs';

import { DownloadArgs, getPointsReport } from './json-download';

type ESArgs = {
    elasticConfig: fs.PathLike;
    indexName: string;
};

type cliArgs = ESArgs & DownloadArgs;

const INDEX_FIELDS_MAPPING = {
    id: { type: 'integer' },
    slug: { type: 'text' },
    date: { type: 'date' },
    nombre: { type: 'text' },
    content: { type: 'text' },
    sector: { type: 'keyword' },
    latitud: { type: 'float' },
    longitud: { type: 'float' },
    location: { type: 'geo_point' },
    direcccion: { type: 'text' },
    provincia: { type: 'keyword' },
    telefono: { type: 'text' },
    horario: { type: 'text' },
    sitioWeb: { type: 'text' },
    email: { type: 'text' },
    facebook: { type: 'text' },
    twitter: { type: 'text' },
    linkedin: { type: 'text' },
    instagram: { type: 'text' },
    crProximidad: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crComercioJusto: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crTransparencia: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crIntegracioSocial: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crIntercooperacio: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crParticipacio: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crFinancesEtiques: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crCriterisEcologics: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crGestioResidus: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crEficienciaEnergetica: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crForquillaSalarial: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crDesenvolupamentPersonal: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crEquitatGenere: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crDemocraciaInterna: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
    crProgramariLliure: { type: 'integer', fields: { keyword: { type: 'keyword' } } },
};

const args = require('yargs')
    .alias('f', 'force')
    .boolean('f')
    .default('f', false)
    .describe('f', 'Force to download the assets')
    .alias('c', 'cache-dir')
    .default('c', '.cache')
    .describe('c', 'Directory for cached assets')
    .alias('e', 'elastic-config')
    .default('e', '.elasticsearch.json')
    .describe('e', 'Elasticsearch configuration JSON file')
    .alias('i', 'index-name')
    .describe('i', 'Elasticsearch Index Name')
    .default('i', 'pamapam').argv as cliArgs;

async function run(): Promise<void> {
    // Get the configuration
    const clientConfig = JSON.parse(fs.readFileSync(args.elasticConfig).toString());
    const client = new Client(clientConfig);
    const INDEX_NAME = args.indexName;

    // Check if the index exists
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (exists && exists.body == true) {
        debug('Removing previous index: ', INDEX_NAME);
        await client.indices.delete({ index: INDEX_NAME });
    }

    // Create a new index
    debug('Creating a new index');
    try {
        await client.indices.create({
            index: INDEX_NAME,
            body: { mappings: { properties: INDEX_FIELDS_MAPPING } },
        });
    } catch (error) {
        console.log('Error when creating the index', JSON.stringify(error.meta.body));
        process.exit(1);
    }

    // Get the points from the cache
    debug('Get the Pam a Pam points');
    const points = await getPointsReport(args);
    console.log(`Pushing ${points.length} records to the index`);
    points.forEach(point => {
        client.index({
            index: INDEX_NAME,
            body: { ...point, location: [point.longitud, point.latitud] },
        });
    });
}

run().catch(console.log);
