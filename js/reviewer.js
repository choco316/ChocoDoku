/**
 * ChocoDoku - reviewer.js
 * Módulo de filtrado, paginación, tabla de revisión y vista de detalle de tableros.
 */

import { getActiveMaster } from './data-manager.js';
import { boardStringToMatrix } from './utils.js';

let currentFilters = {
    searchId: "",
    difficulty: "",
    status: ""
};

let paginationState = {
    currentPage: 1,
    pageSize: 15
};

/**
 * Aplica filtros y obtiene los registros filtrados del Master activo.
 * @returns {Array} Registros filtrados.
 */
export function getFilteredRecords() {
    const master = getActiveMaster();
    let records = master.records || [];

    return records.filter(rec => {
        // Filtro por ID o subcadena
        if (currentFilters.searchId && !rec.id.toLowerCase().includes(currentFilters.searchId.toLowerCase())) {
            return false;
        }
        // Filtro por dificultad
        if (currentFilters.difficulty && rec.difficulty !== currentFilters.difficulty) {
            return false;
        }
        // Filtro por estado
        if (currentFilters.status && rec.status !== currentFilters.status) {
            return false;
        }
        return true;
    });
}

/**
 * Actualiza los criterios de filtro activos.
 * @param {Object} newFilters 
 */
export function setFilters(newFilters) {
    currentFilters = { ...currentFilters, ...newFilters };
    paginationState.currentPage = 1; // Resetear a la primera página al filtrar
}

/**
 * Obtiene los registros correspondientes a la página actual paginada.
 * @returns {Object} { records: Array, totalPages: number, currentPage: number, totalFiltered: number }
 */
export function getPaginatedRecords() {
    const filtered = getFilteredRecords();
    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / paginationState.pageSize) || 1;

    if (paginationState.currentPage > totalPages) {
        paginationState.currentPage = totalPages;
    }
    if (paginationState.currentPage < 1) {
        paginationState.currentPage = 1;
    }

    const start = (paginationState.currentPage - 1) * paginationState.pageSize;
    const end = start + paginationState.pageSize;
    const paginatedSlice = filtered.slice(start, end);

    return {
        records: paginatedSlice,
        totalPages,
        currentPage: paginationState.currentPage,
        totalFiltered
    };
}

/**
 * Cambia la página actual.
 * @param {number} page 
 */
export function setPage(page) {
    paginationState.currentPage = page;
}

/**
 * Renderiza la cuadrícula de 9x9 para la vista de detalle.
 * @param {string} boardStr - Cadena de 81 caracteres.
 * @param {string} [solutionStr=null] - Cadena de solución opcional.
 * @returns {HTMLElement} Contenedor con la representación visual del Sudoku.
 */
export function renderSudokuPreview(boardStr, solutionStr = null) {
    const container = document.createElement('div');
    container.className = 'sudoku-preview-grid-container';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(9, 32px)';
    container.style.gap = '2px';
    container.style.backgroundColor = '#b08d57';
    container.style.padding = '4px';
    container.style.borderRadius = '4px';
    container.style.margin = '0 auto';

    try {
        const matrix = boardStringToMatrix(boardStr);
        const solMatrix = solutionStr ? boardStringToMatrix(solutionStr) : null;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.style.width = '32px';
                cell.style.height = '32px';
                cell.style.backgroundColor = '#fff';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontWeight = 'bold';
                cell.style.fontSize = '14px';

                // Bordes de regiones 3x3
                if ((c + 1) % 3 === 0 && c < 8) cell.style.borderRight = '2px solid #5c3a21';
                if ((r + 1) % 3 === 0 && r < 8) cell.style.borderBottom = '2px solid #5c3a21';

                const val = matrix[r][c];
                if (val !== '0') {
                    cell.textContent = val;
                    cell.style.color = '#2c1810';
                    cell.style.backgroundColor = '#f4efe9';
                } else if (solMatrix) {
                    cell.textContent = solMatrix[r][c];
                    cell.style.color = '#888';
                    cell.style.fontStyle = 'italic';
                } else {
                    cell.textContent = '';
                }

                container.appendChild(cell);
            }
        }
    } catch (e) {
        container.textContent = 'Error al renderizar tablero.';
    }

    return container;
}