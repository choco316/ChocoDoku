/**
 * ChocoDoku - exporter.js
 * Módulo de exportación editorial (JSON y CSV) optimizado para Adobe InDesign y Amazon KDP.
 */

import { getActiveMaster } from './data-manager.js';
import { getFilteredRecords } from './reviewer.js';

/**
 * Obtiene los registros objetivo según el alcance seleccionado.
 * @param {string} scope - 'filtered' o 'all'
 * @returns {Array} Registros a exportar.
 */
function getRecordsByScope(scope) {
    if (scope === 'filtered') {
        return getFilteredRecords();
    } else {
        const master = getActiveMaster();
        return master.records || [];
    }
}

/**
 * Convierte un arreglo de registros en una cadena CSV tabulada.
 * Soporta exportación desplegada C1..C81 y por filas para InDesign.
 * @param {Array} records 
 * @param {string} type - 'puzzles', 'solutions', 'indesign-grid', 'indesign-rows', 'manifest'
 * @returns {string} Contenido CSV.
 */
function recordsToCSV(records, type) {
    let headers = [];
    let rows = [];

    if (type === 'puzzles') {
        headers = ['ID', 'CollectionId', 'VolumeId', 'Difficulty', 'Status', 'Puzzle'];
        rows = records.map(r => [r.id, r.collectionId, r.volumeId, r.difficulty, r.status, `"${r.puzzle}"`]);
    } else if (type === 'solutions') {
        headers = ['ID', 'CollectionId', 'VolumeId', 'Difficulty', 'Status', 'Solution'];
        rows = records.map(r => [r.id, r.collectionId, r.volumeId, r.difficulty, r.status, `"${r.solution}"`]);
    } else if (type === 'indesign-grid') {
        // C1 a C81 para Data Merge o Scripts
        const cellHeaders = Array.from({ length: 81 }, (_, i) => `C${i + 1}`);
        headers = ['ID', 'CollectionId', 'VolumeId', 'Difficulty', 'Status', 'Type', ...cellHeaders];
        
        rows = records.map(r => {
            const boardStr = r.puzzle;
            const cells = boardStr.split('').map(char => char === '0' ? '""' : char);
            return [r.id, r.collectionId, r.volumeId, r.difficulty, r.status, 'Puzzle', ...cells];
        });
    } else if (type === 'indesign-rows') {
        // Row_1 a Row_9 para lectura rápida por filas
        headers = ['ID', 'CollectionId', 'VolumeId', 'Difficulty', 'Status', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
        
        rows = records.map(r => {
            const boardStr = r.puzzle;
            const rowValues = [];
            for (let i = 0; i < 9; i++) {
                const rowStr = boardStr.substring(i * 9, (i + 1) * 9);
                const formattedRow = rowStr.split('').map(c => c === '0' ? ' ' : c).join('');
                rowValues.push(`"${formattedRow}"`);
            }
            return [r.id, r.collectionId, r.volumeId, r.difficulty, r.status, ...rowValues];
        });
    } else if (type === 'manifest') {
        headers = ['ID', 'CollectionId', 'VolumeId', 'Difficulty', 'Status', 'CreatedAt', 'MaxComplexity', 'TechniquesUsed'];
        rows = records.map(r => [
            r.id,
            r.collectionId,
            r.volumeId,
            r.difficulty,
            r.status,
            r.createdAt,
            r.difficultyAnalysis?.maxComplexity || 'N/A',
            `"${(r.difficultyAnalysis?.techniquesUsed || []).join(', ')}"`
        ]);
    }

    return [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
}

/**
 * Genera el archivo descargable (Blob) según el formato y alcance solicitados.
 * @param {string} format - 'json', 'csv-puzzles', 'csv-solutions', 'indesign-grid', 'indesign-rows', 'manifest'
 * @param {string} scope - 'filtered' o 'all'
 * @returns {Object} { blob: Blob, filename: string, count: number }
 */
export function generateExportFile(format, scope = 'filtered') {
    const records = getRecordsByScope(scope);
    const master = getActiveMaster();
    const volumeIdClean = master.volumeId.replace(/\s+/g, '_');
    
    let blob;
    let filename = '';
    let count = records.length;

    if (format === 'json') {
        const exportObj = {
            ...master,
            records: records
        };
        const jsonStr = JSON.stringify(exportObj, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
        filename = `ChocoDoku_${volumeIdClean}_Master.json`;
    } else {
        let csvType = format;
        let suffix = format;

        if (format === 'indesign-grid') suffix = 'InDesign_C1_C81';
        if (format === 'indesign-rows') suffix = 'InDesign_Rows';
        if (format === 'csv-puzzles') suffix = 'Puzzles';
        if (format === 'csv-solutions') suffix = 'Solutions';

        const csvString = recordsToCSV(records, csvType);
        blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        filename = `ChocoDoku_${volumeIdClean}_${suffix}.csv`;
    }

    return { blob, filename, count };
}