/**
 * ChocoDoku - validator.js
 * Módulo independiente de validación estructural, matemática, de consistencia y unicidad.
 */

import { normalizeBoard, isValidBoardString } from './utils.js';
import { solveSudoku } from './solver.js';

/**
 * Valida la estructura y validez matemática de un tablero inicial y su solución opcional.
 * @param {string|Array} puzzleInput - Tablero inicial.
 * @param {string|Array} [solutionInput=null] - Solución completa (opcional).
 * @returns {Object} Resultados detallados de cada prueba de validación.
 */
export function validatePuzzle(puzzleInput, solutionInput = null) {
    const result = {
        structure: "failed",
        conflicts: "failed",
        uniqueness: "failed",
        consistency: "failed",
        isValid: false,
        errors: []
    };

    // 1. Validación Estructural
    let puzzleStr = "";
    try {
        puzzleStr = normalizeBoard(puzzleInput);
        if (!isValidBoardString(puzzleStr)) {
            throw new Error("El tablero no cumple con el formato canónico de 81 caracteres numéricos.");
        }
        result.structure = "passed";
    } catch (e) {
        result.errors.push(`Error estructural en tablero: ${e.message}`);
        return result;
    }

    // 2. Validación de Conflictos en Pistas (Filas, Columnas, Regiones 3x3)
    const grid = [];
    for (let i = 0; i < 9; i++) {
        grid.push(puzzleStr.substring(i * 9, (i + 1) * 9).split('').map(Number));
    }

    let hasConflict = false;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = grid[r][c];
            if (val !== 0) {
                // Comprobar fila y columna
                for (let i = 0; i < 9; i++) {
                    if (i !== c && grid[r][i] === val) hasConflict = true;
                    if (i !== r && grid[i][c] === val) hasConflict = true;
                }
                // Comprobar región 3x3
                const startRow = Math.floor(r / 3) * 3;
                const startCol = Math.floor(c / 3) * 3;
                for (let dr = 0; dr < 3; dr++) {
                    for (let dc = 0; dc < 3; dc++) {
                        const cr = startRow + dr;
                        const cc = startCol + dc;
                        if ((cr !== r || cc !== c) && grid[cr][cc] === val) {
                            hasConflict = true;
                        }
                    }
                }
            }
        }
    }

    if (hasConflict) {
        result.conflicts = "failed";
        result.errors.push("Conflicto detectado en las pistas iniciales (números repetidos en fila, columna o región).");
        return result;
    } else {
        result.conflicts = "passed";
    }

    // 3. Validación de Resolución y Unicidad (Solver)
    const solveResult = solveSudoku(puzzleStr);
    if (solveResult.solutionsCount === 0) {
        result.uniqueness = "failed";
        result.errors.push("El puzzle no tiene solución matemática.");
        return result;
    } else if (solveResult.solutionsCount > 1) {
        result.uniqueness = "failed";
        result.errors.push(`El puzzle tiene múltiples soluciones (${solveResult.solutionsCount}), no cumple el criterio de unicidad.`);
        return result;
    } else {
        result.uniqueness = "passed";
    }

    // 4. Validación de Consistencia (Si se proporciona solución externa)
    if (solutionInput) {
        let solutionStr = "";
        try {
            solutionStr = normalizeBoard(solutionInput);
        } catch (e) {
            result.consistency = "failed";
            result.errors.push(`Error en formato de la solución proporcionada: ${e.message}`);
            return result;
        }

        // Comprobar que la solución respeta las pistas del puzzle inicial
        let matchesPista = true;
        for (let i = 0; i < 81; i++) {
            if (puzzleStr[i] !== '0' && puzzleStr[i] !== solutionStr[i]) {
                matchesPista = false;
                break;
            }
        }

        if (!matchesPista || solutionStr !== solveResult.solution) {
            result.consistency = "failed";
            result.errors.push("La solución proporcionada no es consistente con las pistas iniciales o es incorrecta.");
            return result;
        } else {
            result.consistency = "passed";
        }
    } else {
        // Si no se pasó explícitamente, asignamos la encontrada por el solver
        result.consistency = "passed";
        result.solvedSolution = solveResult.solution;
    }

    // Si todas las pruebas pasaron
    result.isValid = true;
    return result;
}