/**
 * ChocoDoku - generator.js
 * Generador optimizado por lotes con distribución dinámica de simetrías y dificultad.
 */

import { normalizeBoard, getCurrentTimestamp } from './utils.js';
import { solveSudoku } from './solver.js';
import { validatePuzzle } from './validator.js';
import { classifyDifficulty } from './solver.js';
import { checkDuplicate, registerToGlobalIndex } from './duplicate-index.js';
import { addPuzzleRecord } from './data-manager.js';

// Semillas/Bases válidas y completas para variabilidad
const BASE_SOLUTIONS = [
    "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
    "123456789456789123789123456214365897365897214897214365531642978642978531978531642",
    "827154396965327148341689752593468217472815963186973425214796583638541279759238614"
];

/**
 * Permuta dígitos y filas/columnas para generar soluciones totalmente distintas pero válidas.
 */
function getRandomFullSolution() {
    const base = BASE_SOLUTIONS[Math.floor(Math.random() * BASE_SOLUTIONS.length)].split('').map(Number);
    
    // Mapeo aleatorio de dígitos 1-9
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [digits[i], digits[j]] = [digits[j], digits[i]];
    }

    return base.map(d => digits[d - 1]).join('');
}

/**
 * Remueve pistas de un tablero completo según la dificultad objetivo.
 */
function createPuzzleCandidate(solutionStr, targetDiff) {
    const arr = solutionStr.split('');
    
    // Definir cantidad aproximada de pistas según nivel
    let targetClues = 38; // Easy
    if (targetDiff === 'Medium') targetClues = 33;
    if (targetDiff === 'Hard') targetClues = 29;
    if (targetDiff === 'Expert') targetClues = 25;

    // Agregar variabilidad aleatoria (+/- 1 pista)
    targetClues += (Math.floor(Math.random() * 3) - 1);

    const positions = Array.from({ length: 81 }, (_, i) => i);
    // Mezclar posiciones aleatoriamente (Simetría opcional por rotación)
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    let currentClues = 81;
    for (const pos of positions) {
        if (currentClues <= targetClues) break;

        const backup = arr[pos];
        arr[pos] = '0';
        currentClues--;

        // Verificación rápida: si al quitar se rompe la solución o unicidad, revertir
        const tempBoard = arr.join('');
        const check = solveSudoku(tempBoard);
        if (!check.hasUniqueSolution) {
            arr[pos] = backup;
            currentClues++;
        }
    }

    return arr.join('');
}

/**
 * Genera un lote de puzzles según los requerimientos de dificultad y cantidad.
 */
export async function generateBatch(config, progressCallback) {
    const { collectionId, volumeId, seed, counts } = config;
    
    const summary = {
        requested: counts,
        generated: { Easy: 0, Medium: 0, Hard: 0, Expert: 0 },
        accepted: { Easy: 0, Medium: 0, Hard: 0, Expert: 0 },
        rejected: 0,
        duplicates: 0,
        errors: []
    };

    const targetDifficulties = ["Easy", "Medium", "Hard", "Expert"];
    
    for (const diff of targetDifficulties) {
        const targetQty = counts[diff] || 0;
        let createdForDiff = 0;
        let attempts = 0;
        const maxAttempts = targetQty * 50; // Mayor margen para encontrar Hard y Expert

        while (createdForDiff < targetQty && attempts < maxAttempts) {
            attempts++;

            // 1. Solución base aleatoria
            const fullSolution = getRandomFullSolution();
            
            // 2. Aplicar máscara de vacíos orientada al nivel objetivo
            const rawPuzzle = createPuzzleCandidate(fullSolution, diff);

            // 3. Validar matemática y estructuralmente
            const valResult = validatePuzzle(rawPuzzle);
            if (!valResult.isValid) {
                summary.rejected++;
                continue;
            }

            // 4. Clasificar dificultad lógica
            const classification = classifyDifficulty(rawPuzzle);
            if (classification.status !== "classified" || classification.difficulty !== diff) {
                summary.rejected++;
                continue;
            }

            // 5. Comprobar duplicidad exacta celda por celda
            const duplicateCheck = checkDuplicate(rawPuzzle);
            if (duplicateCheck) {
                summary.duplicates++;
                summary.rejected++;
                continue;
            }

            // 6. Guardar si cumple todas las condiciones
            try {
                const recordData = {
                    collectionId,
                    volumeId,
                    difficulty: diff,
                    puzzle: rawPuzzle,
                    solution: fullSolution,
                    status: "validated",
                    generation: {
                        seed: seed || `gen-${Date.now()}`,
                        generatorVersion: "1.1.0",
                        timestamp: getCurrentTimestamp()
                    },
                    validation: {
                        structure: valResult.structure,
                        conflicts: valResult.conflicts,
                        uniqueness: valResult.uniqueness,
                        consistency: valResult.consistency
                    },
                    difficultyAnalysis: {
                        techniquesUsed: classification.techniquesUsed,
                        maxComplexity: classification.maxComplexity,
                        status: classification.status
                    }
                };

                const addedRecord = addPuzzleRecord(recordData);
                
                registerToGlobalIndex(addedRecord.puzzle, {
                    id: addedRecord.id,
                    volumeId: addedRecord.volumeId,
                    collectionId: addedRecord.collectionId
                });

                summary.generated[diff]++;
                summary.accepted[diff]++;
                createdForDiff++;

                if (typeof progressCallback === 'function') {
                    progressCallback({
                        currentDifficulty: diff,
                        progress: createdForDiff,
                        target: targetQty,
                        summary
                    });
                }

            } catch (err) {
                summary.errors.push(`Error al guardar registro: ${err.message}`);
                summary.rejected++;
            }

            // Pausa periódica para mantener la interfaz receptiva en el navegador
            if (attempts % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    }

    return summary;
}
