/**
 * ChocoDoku - data-manager.js
 * Gestión del Master JSON, esquema, registros en memoria, validación de importación y cambios pendientes.
 */

import { normalizeBoard, isValidBoardString, generateStableId, getCurrentTimestamp } from './utils.js';

export const CURRENT_SCHEMA_VERSION = "1.0.0";

/**
 * Estructura en memoria del Master activo de la colección/volumen.
 */
let activeMaster = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    collectionId: "ChocoDoku Volumen 1",
    volumeId: "Vol-01",
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    metadata: {
        totalRegistered: 0,
        countsByDifficulty: { Easy: 0, Medium: 0, Hard: 0, Expert: 0 },
        countsByStatus: { candidate: 0, validated: 0, reserved: 0, published: 0, rejected: 0 }
    },
    records: []
};

let hasPendingChanges = false;

/**
 * Obtiene una copia del Master activo actual.
 * @returns {Object}
 */
export function getActiveMaster() {
    return JSON.parse(JSON.stringify(activeMaster));
}

/**
 * Indica si existen cambios pendientes de descarga.
 * @returns {boolean}
 */
export function getPendingChangesStatus() {
    return hasPendingChanges;
}

/**
 * Establece el estado de cambios pendientes y actualiza la interfaz visual si existe el indicador.
 * @param {boolean} status 
 */
export function setPendingChanges(status) {
    hasPendingChanges = status;
    const badge = document.getElementById('pending-changes-badge');
    const masterStatus = document.getElementById('master-status');
    
    if (badge) {
        if (hasPendingChanges) {
            badge.textContent = "Cambios pendientes de guardar";
            badge.className = "status-indicator warning";
        } else {
            badge.textContent = "Sin cambios pendientes";
            badge.className = "status-indicator neutral";
        }
    }

    if (masterStatus) {
        masterStatus.textContent = `Master: ${activeMaster.volumeId} (${activeMaster.records.length} regs)`;
        masterStatus.className = "status-indicator success";
    }
}

/**
 * Valida la estructura básica de un objeto Master JSON importado.
 * @param {Object} data 
 * @returns {Object} { isValid: boolean, error: string }
 */
export function validateMasterSchema(data) {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: "El archivo no contiene un objeto JSON válido." };
    }
    if (!data.schemaVersion) {
        return { isValid: false, error: "Falta la propiedad obligatoria 'schemaVersion'." };
    }
    if (!Array.isArray(data.records)) {
        return { isValid: false, error: "El campo 'records' debe ser un arreglo de registros." };
    }
    return { isValid: true, error: null };
}

/**
 * Importa y carga un Master JSON desde un archivo parseado.
 * @param {Object} jsonData 
 * @returns {Object} Resumen de la importación
 */
export function importMasterJSON(jsonData) {
    const validation = validateMasterSchema(jsonData);
    if (!validation.isValid) {
        throw new Error(`Error de validación del Master: ${validation.error}`);
    }

    // Comprobación de compatibilidad de versión de esquema (migración futura si fuera necesario)
    if (jsonData.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        console.warn(`Advertencia: La versión del esquema (${jsonData.schemaVersion}) difiere de la actual (${CURRENT_SCHEMA_VERSION}). Se intentará adaptar.`);
    }

    activeMaster = JSON.parse(JSON.stringify(jsonData));
    recalculateMetadata();
    setPendingChanges(false);

    return {
        success: true,
        collectionId: activeMaster.collectionId,
        volumeId: activeMaster.volumeId,
        totalRecords: activeMaster.records.length
    };
}

/**
 * Recalcula las estadísticas de metadatos basadas en los registros actuales.
 */
export function recalculateMetadata() {
    const countsDiff = { Easy: 0, Medium: 0, Hard: 0, Expert: 0, Unclassified: 0 };
    const countsStatus = { candidate: 0, validated: 0, reserved: 0, published: 0, rejected: 0 };

    activeMaster.records.forEach(rec => {
        if (countsDiff[rec.difficulty] !== undefined) {
            countsDiff[rec.difficulty]++;
        } else {
            countsDiff.Unclassified = (countsDiff.Unclassified || 0) + 1;
        }

        if (countsStatus[rec.status] !== undefined) {
            countsStatus[rec.status]++;
        } else {
            countsStatus.candidate++;
        }
    });

    activeMaster.metadata.totalRegistered = activeMaster.records.length;
    activeMaster.metadata.countsByDifficulty = countsDiff;
    activeMaster.metadata.countsByStatus = countsStatus;
    activeMaster.updatedAt = getCurrentTimestamp();
}

/**
 * Añade un nuevo candidato de puzzle al Master activo.
 * @param {Object} puzzleData - Datos crudos del puzzle { collectionId, volumeId, difficulty, puzzle, solution, generation, validation, difficultyAnalysis }
 * @returns {Object} El registro creado y normalizado.
 */
export function addPuzzleRecord(puzzleData) {
    const normalizedPuzzle = normalizeBoard(puzzleData.puzzle);
    const normalizedSolution = normalizeBoard(puzzleData.solution);
    
    // Generar ID estable basado en el conteo actual + 1
    const nextIndex = activeMaster.records.length + 1;
    const recordId = puzzleData.id || generateStableId(activeMaster.volumeId, nextIndex);

    // Verificar colisión de ID estricta
    if (activeMaster.records.some(r => r.id === recordId)) {
        throw new Error(`Colisión detectada: El ID ${recordId} ya existe en el Master.`);
    }

    const newRecord = {
        id: recordId,
        collectionId: puzzleData.collectionId || activeMaster.collectionId,
        volumeId: puzzleData.volumeId || activeMaster.volumeId,
        difficulty: puzzleData.difficulty || "Pending",
        puzzle: normalizedPuzzle,
        solution: normalizedSolution,
        status: puzzleData.status || "candidate",
        generation: puzzleData.generation || { seed: null, generatorVersion: "0.1.0", timestamp: getCurrentTimestamp() },
        validation: puzzleData.validation || { structure: "pending", conflicts: "pending", uniqueness: "pending", consistency: "pending" },
        difficultyAnalysis: puzzleData.difficultyAnalysis || { techniquesUsed: [], maxComplexity: "pending", status: "pending" },
        createdAt: getCurrentTimestamp(),
        duplicateOf: puzzleData.duplicateOf || null
    };

    activeMaster.records.push(newRecord);
    recalculateMetadata();
    setPendingChanges(true);

    return newRecord;
}

/**
 * Actualiza el estado editorial de un registro específico.
 * @param {string} recordId 
 * @param {string} newStatus 
 * @returns {boolean}
 */
export function updateRecordStatus(recordId, newStatus) {
    const validStatuses = ["candidate", "validated", "reserved", "published", "rejected"];
    if (!validStatuses.includes(newStatus)) {
        throw new Error(`Estado editorial inválido: ${newStatus}`);
    }

    const record = activeMaster.records.find(r => r.id === recordId);
    if (!record) {
        throw new Error(`No se encontró el registro con ID ${recordId}`);
    }

    record.status = newStatus;
    recalculateMetadata();
    setPendingChanges(true);
    return true;
}

/**
 * Genera el Blob JSON para descargar el Master activo.
 * @returns {Blob}
 */
export function exportMasterBlob() {
    activeMaster.updatedAt = getCurrentTimestamp();
    const dataStr = JSON.stringify(activeMaster, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    setPendingChanges(false);
    return blob;
}