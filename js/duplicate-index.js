/**
 * ChocoDoku - duplicate-index.js
 * Índice global de duplicados y comparación exacta celda por celda de tableros normalizados.
 */

import { normalizeBoard } from './utils.js';

/**
 * Estructura del Índice Global en memoria.
 * Mapea: { [boardString_81_chars]: { id, volumeId, collectionId, originalIndex } }
 */
let globalDuplicateIndex = new Map();

let indexMetadata = {
    schemaVersion: "1.0.0",
    lastUpdated: null,
    totalIndexed: 0,
    includedCollections: []
};

/**
 * Obtiene el estado actual del índice global y sus metadatos.
 * @returns {Object}
 */
let includeCollectionsList = [];

export function getGlobalIndexData() {
    const recordsObj = {};
    for (const [boardStr, origin] of globalDuplicateIndex.entries()) {
        recordsObj[boardStr] = origin;
    }
    return {
        schemaVersion: indexMetadata.schemaVersion,
        lastUpdated: indexMetadata.lastUpdated,
        totalIndexed: globalDuplicateIndex.size,
        includedCollections: indexMetadata.includedCollections,
        indexEntries: recordsObj
    };
}

/**
 * Importa un índice global desde un archivo JSON externo.
 * @param {Object} jsonData 
 * @returns {boolean}
 */
export function importGlobalIndexJSON(jsonData) {
    if (!jsonData || !jsonData.indexEntries) {
        throw new Error("Estructura de índice global inválida o faltan 'indexEntries'.");
    }

    globalDuplicateIndex.clear();
    const entries = jsonData.indexEntries;
    
    for (const [boardStr, origin] of Object.entries(entries)) {
        globalDuplicateIndex.set(boardStr, origin);
    }

    indexMetadata.schemaVersion = jsonData.schemaVersion || "1.0.0";
    indexMetadata.lastUpdated = jsonData.lastUpdated || new Date().toISOString();
    indexMetadata.totalIndexed = globalDuplicateIndex.size;
    indexMetadata.includedCollections = jsonData.includedCollections || [];

    return true;
}

/**
 * Comprueba si un tablero ya existe en el índice global o dentro de un lote/Master.
 * Compara estrictamente la cadena canónica de 81 caracteres (celda por celda).
 * @param {string|Array} boardInput 
 * @returns {Object|null} Retorna el origen ({ id, volumeId, collectionId }) si es duplicado, o null si es único.
 */
export function checkDuplicate(boardInput) {
    try {
        const normalized = normalizeBoard(boardInput);
        if (globalDuplicateIndex.has(normalized)) {
            return globalDuplicateIndex.get(normalized);
        }
        return null;
    } catch (e) {
        console.error("Error al comprobar duplicado:", e);
        return null;
    }
}

/**
 * Registra un nuevo tablero válido en el índice global de duplicados.
 * @param {string|Array} boardInput 
 * @param {Object} recordInfo - { id, volumeId, collectionId }
 * @returns {boolean} True si se añadió, False si ya existía (duplicado).
 */
export function registerToGlobalIndex(boardInput, recordInfo) {
    const normalized = normalizeBoard(boardInput);
    if (globalDuplicateIndex.has(normalized)) {
        return false; // Ya existe, es duplicado exacto
    }

    globalDuplicateIndex.set(normalized, {
        id: recordInfo.id,
        volumeId: recordInfo.volumeId,
        collectionId: recordInfo.collectionId
    });

    indexMetadata.totalIndexed = globalDuplicateIndex.size;
    indexMetadata.lastUpdated = new Date().toISOString();
    return true;
}

/**
 * Reconstruye el índice global de duplicados a partir de uno o varios Masters JSON cargados.
 * @param {Array<Object>} mastersList - Arreglo de objetos Master JSON.
 */
export function rebuildGlobalIndexFromMasters(mastersList) {
    globalDuplicateIndex.clear();
    const collectionsSet = new Set();

    if (!Array.isArray(mastersList)) {
        mastersList = [mastersList];
    }

    mastersList.forEach(master => {
        if (!master || !Array.isArray(master.records)) return;

        collectionsSet.add(`${master.collectionId} (${master.volumeId})`);

        master.records.forEach(rec => {
            // Solo indexamos los que superaron validaciones o son candidatos limpios
            if (rec.puzzle) {
                try {
                    const normalized = normalizeBoard(rec.puzzle);
                    if (!globalDuplicateIndex.has(normalized)) {
                        globalDuplicateIndex.set(normalized, {
                            id: rec.id,
                            volumeId: rec.volumeId,
                            collectionId: rec.collectionId
                        });
                    }
                } catch (e) {
                    console.warn(`Registro ${rec.id} omitido en índice por tablero inválido.`);
                }
            }
        });
    });

    indexMetadata.totalIndexed = globalDuplicateIndex.size;
    indexMetadata.lastUpdated = new Date().toISOString();
    indexMetadata.includedCollections = Array.from(collectionsSet);

    return {
        totalIndexed: globalDuplicateIndex.size,
        includedCollections: indexMetadata.includedCollections
    };
}

/**
 * Genera el Blob JSON para exportar el índice global de duplicados.
 * @returns {Blob}
 */
export function exportGlobalIndexBlob() {
    const exportData = getGlobalIndexData();
    const dataStr = JSON.stringify(exportData, null, 2);
    return new Blob([dataStr], { type: 'application/json' });
}