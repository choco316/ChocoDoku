/**
 * ChocoDoku - utils.js
 * Funciones de utilidad general, normalización y validaciones base.
 */

/**
 * Normaliza cualquier representación de un tablero de Sudoku (array de 81 elementos, matriz 9x9 o cadena)
 * a una cadena canónica estrictamente de 81 caracteres, donde las celdas vacías se representan con '0'.
 * @param {string|Array|Array<Array>} boardInput - El tablero a normalizar.
 * @returns {string} Cadena canónica de 81 caracteres.
 */
export function normalizeBoard(boardInput) {
    if (!boardInput) return '0'.repeat(81);

    let flatArray = [];

    if (typeof boardInput === 'string') {
        // Limpiar espacios u otros caracteres si los hubiera
        const cleaned = boardInput.replace(/[\s\n\r]/g, '');
        if (cleaned.length !== 81) {
            throw new Error(`Tablero inválido: la cadena debe tener exactamente 81 caracteres (tiene ${cleaned.length}).`);
        }
        flatArray = cleaned.split('').map(char => (char >= '1' && char <= '9' ? char : '0'));
    } else if (Array.isArray(boardInput)) {
        if (Array.isArray(boardInput[0])) {
            // Es una matriz 9x9
            if (boardInput.length !== 9 || boardInput.some(row => row.length !== 9)) {
                throw new Error('Tablero inválido: la matriz debe ser de 9x9.');
            }
            flatArray = boardInput.flat().map(cell => {
                const num = parseInt(cell, 10);
                return (num >= 1 && num <= 9) ? String(num) : '0';
            });
        } else {
            // Es un array plano
            if (boardInput.length !== 81) {
                throw new Error(`Tablero inválido: el array plano debe tener 81 elementos (tiene ${boardInput.length}).`);
            }
            flatArray = boardInput.map(cell => {
                const num = parseInt(cell, 10);
                return (num >= 1 && num <= 9) ? String(num) : '0';
            });
        }
    } else {
        throw new Error('Formato de tablero no reconocido.');
    }

    return flatArray.join('');
}

/**
 * Comprueba si una cadena representa un tablero normalizado válido (81 caracteres numéricos 0-9).
 * @param {string} str 
 * @returns {boolean}
 */
export function isValidBoardString(str) {
    return typeof str === 'string' && /^[0-9]{81}$/.test(str);
}

/**
 * Genera un identificador único y estable para un registro.
 * @param {string} volumeId 
 * @param {number} index 
 * @returns {string}
 */
export function generateStableId(volumeId, index) {
    const paddedIndex = String(index).padStart(4, '0');
    return `${volumeId}-${paddedIndex}`;
}

/**
 * Convierte una cadena de 81 caracteres en una matriz de 9x9 para renderizado.
 * @param {string} boardStr 
 * @returns {Array<Array<string>>}
 */
export function boardStringToMatrix(boardStr) {
    if (!isValidBoardString(boardStr)) {
        throw new Error('Cadena de tablero inválida para convertir a matriz.');
    }
    const matrix = [];
    for (let i = 0; i < 9; i++) {
        matrix.push(boardStr.substring(i * 9, (i + 1) * 9).split(''));
    }
    return matrix;
}

/**
 * Formatea una fecha u hora actual para registros de metadatos.
 * @returns {string} Fecha ISO 8601
 */
export function getCurrentTimestamp() {
    return new Date().toISOString();
}