import * as fs from 'fs';
import * as path from 'path';
import { default as mkdirp } from 'mkdirp';
import { parse } from 'json2csv';
import * as htmlToText from 'html-to-text';
import { Feature, FeatureCollection } from 'geojson';

import { debug, downloadAsset } from './utils';

type DownloadArgs = {
    force: boolean;
    cacheDir: string;
    output: string | undefined;
};

type RawPoint = {
    id: number;
    slug: string;
    post_title: string;
    post_content: string;
    post_date: string;
    'wpcf-proximidad': string;
    'wpcf-comercio-justo': string;
    'wpcf-transparencia': string;
    'wpcf-integracio-social': string;
    'wpcf-intercooperacio': string;
    'wpcf-participacio': string;
    'wpcf-finances-etiques': string;
    'wpcf-criteris-ecologics': string;
    'wpcf-gestio-de-residus': string;
    'wpcf-eficiencia-energetica': string;
    'wpcf-forquilla-salarial': string;
    'wpcf-desenvolupament-personal': string;
    'wpcf-equitat-de-genere': string;
    'wpcf-democracia-interna': string;
    'wpcf-programari-lliure': string;
    latitud: string;
    longitud: string;
    'wpcf-direccion': string;
    'wpcf-telefono-de-atencion': string;
    'wpcf-horario': string;
    'wpcf-sitio-web': string;
    'wpcf-email-de-contacto': string;
    'wpcf-facebook': string;
    'wpcf-twitter': string;
    'wpcf-linkedin': string;
    'wpcf-instagram': string;

    tags: [
        {
            name: string;
            taxonomy: string;
        },
    ];
};

type ProcessedPoint = {
    id: number;
    slug: string;
    date: Date;

    nombre: string;
    content: string;
    sector: string;

    latitud: number;
    longitud: number;

    direcccion: string;
    provincia: string;
    telefono: string;
    horario: string;
    sitioWeb: string;
    email: string;
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;

    crProximidad: number;
    crComercioJusto: number;
    crTransparencia: number;
    crIntegracioSocial: number;
    crIntercooperacio: number;
    crParticipacio: number;
    crFinancesEtiques: number;
    crCriterisEcologics: number;
    crGestioResidus: number;
    crEficienciaEnergetica: number;
    crForquillaSalarial: number;
    crDesenvolupamentPersonal: number;
    crEquitatGenere: number;
    crDemocraciaInterna: number;
    crProgramariLliure: number;
};

const PUNTS_URL = 'https://pamapampv.org/directori-de-punts/?json';

function processPoint(point: RawPoint): Partial<ProcessedPoint> {
    return {
        id: point.id,
        slug: point.slug,
        date: new Date(point.post_date),

        nombre: point.post_title,
        content: htmlToText.fromString(point.post_content),
        sector: point.tags.find(t => t.taxonomy == 'sector')?.name,

        latitud: parseFloat(point.latitud),
        longitud: parseFloat(point.longitud),
        direcccion: point['wpcf-direccion'],
        provincia: point.tags.find(t => t.taxonomy == 'provincia')?.name,
        telefono: point['wpcf-telefono-de-atencion'],
        horario: point['wpcf-horario'],

        sitioWeb: point['wpcf-sitio-web'],
        email: point['wpcf-email-de-contacto'],
        facebook: point['wpcf-facebook'],
        twitter: point['wpcf-twitter'],
        linkedin: point['wpcf-linkedin'],
        instagram: point['wpcf-instagram'],

        crProximidad: parseInt(point['wpcf-proximidad']),
        crComercioJusto: parseInt(point['wpcf-comercio-justo']),
        crTransparencia: parseInt(point['wpcf-transparencia']),
        crIntegracioSocial: parseInt(point['wpcf-integracio-social']),
        crIntercooperacio: parseInt(point['wpcf-intercooperacio']),
        crParticipacio: parseInt(point['wpcf-participacio']),
        crFinancesEtiques: parseInt(point['wpcf-finances-etiques']),
        crCriterisEcologics: parseInt(point['wpcf-criteris-ecologics']),
        crGestioResidus: parseInt(point['wpcf-gestio-de-residus']),
        crEficienciaEnergetica: parseInt(point['wpcf-eficiencia-energetica']),
        crForquillaSalarial: parseInt(point['wpcf-forquilla-salarial']),
        crDesenvolupamentPersonal: parseInt(point['wpcf-desenvolupament-personal']),
        crEquitatGenere: parseInt(point['wpcf-equitat-de-genere']),
        crDemocraciaInterna: parseInt(point['wpcf-democracia-interna']),
        crProgramariLliure: parseInt(point['wpcf-programari-lliure']),
    };
}

function getGeoJSON(points: ProcessedPoint[]): FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: points.map(point => {
            return {
                id: point.id,
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [point.longitud, point.latitud],
                },
                properties: point,
            };
        }) as Feature[],
    } as FeatureCollection;
}

async function getPointsReport(args: DownloadArgs): Promise<ProcessedPoint[]> {
    // Confirm cache dir exists
    if (!fs.existsSync(args.cacheDir)) {
        mkdirp(args.cacheDir, err => {
            if (err) {
                console.log(err);
            }
        });
    }

    // Get the JSON web output
    const jsonPath = path.join(args.cacheDir, 'raw-points.json');
    const jsonPoints = (await downloadAsset(args.force, new URL(PUNTS_URL), jsonPath)).toString();
    const points = JSON.parse(jsonPoints) as [];

    // Process and save the JSON
    const processedPoints = points.map(processPoint) as ProcessedPoint[];
    const processedPointsPath = path.join(args.cacheDir, 'points.json');
    console.log('Writing the processed points into:', processedPointsPath);
    fs.writeFileSync(processedPointsPath, JSON.stringify(processedPoints));

    // Generate CSV output
    if (args.output) {
        const stripHTML = processedPoints.map(
            (point: ProcessedPoint): ProcessedPoint => {
                const clone = { ...point };
                clone.content = htmlToText.fromString(point.content);
                return clone;
            },
        );
        console.log(`CSV stored succesfully at ${args.output} with ${stripHTML.length} records`);
        fs.writeFileSync(args.output, parse(stripHTML));
    }

    return processedPoints as ProcessedPoint[];
}

export { DownloadArgs, getPointsReport };
