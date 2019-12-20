import { Client } from '@elastic/elasticsearch';
import { debug } from './utils';

import { DownloadArgs, getPointsReport } from './json-download';

const INDEX_FIELDS_MAPPING = {
    id: { type: 'integer' },
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
    crProximidad: { type: 'keyword' },
    crComercioJusto: { type: 'keyword' },
    crTransparencia: { type: 'keyword' },
    crIntegracioSocial: { type: 'keyword' },
    crIntercooperacio: { type: 'keyword' },
    crParticipacio: { type: 'keyword' },
    crFinancesEtiques: { type: 'keyword' },
    crCriterisEcologics: { type: 'keyword' },
    crGestioResidus: { type: 'keyword' },
    crEficienciaEnergetica: { type: 'keyword' },
    crForquillaSalarial: { type: 'keyword' },
    crDesenvolupamentPersonal: { type: 'keyword' },
    crEquitatGenere: { type: 'keyword' },
    crDemocraciaInterna: { type: 'keyword' },
    crProgramariLliure: { type: 'keyword' },
};

// TODO to parametrize this
const client = new Client({ node: 'http://localhost:9200' });
const INDEX_NAME = 'pamapam';

const args = require('yargs')
    .alias('f', 'force')
    .boolean('f')
    .default('f', true)
    .describe('f', 'Force to download the assets')
    .alias('c', 'cache-dir')
    .describe('c', 'Directory for cached assets')
    .default('c', '.cache').argv as DownloadArgs;

const argsType: DownloadArgs = args;

debug('force', argsType.force);
debug('cacheDir', argsType.cacheDir);

async function run(): Promise<void> {
    // Check if the index exists
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (exists && exists.body == true) {
        debug('Removing previous index...');
        await client.indices.delete({ index: INDEX_NAME });
    }

    // Create a new index
    debug('Creating a new index');
    await client.indices.create({
        index: INDEX_NAME,
        body: {
            mappings: {
                properties: INDEX_FIELDS_MAPPING,
            },
        },
    });

    // Get the points from the cache
    const points = getPointsReport(argsType);
    debug('points', (await points).length);
    (await points).forEach(point => {
        client.index({
            index: INDEX_NAME,
            body: { ...point, location: [point.longitud, point.latitud] },
        });
    });
}

run().catch(console.log);
