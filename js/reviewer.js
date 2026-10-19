/**
 * ChocoDoku - reviewer.js
 * Módulo de filtrado, paginación, tabla de revisión y vista dual de tableros (Puzzle vs Solución).
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
 */
export function getFilteredRecords() {
    const master = getActiveMaster();
    let records = master.records || [];

    return records.filter(rec => {
        if (currentFilters.searchId && !rec.id.toLowerCase().includes(currentFilters.searchId.toLowerCase())) {
            return false;
        }
        if (currentFilters.difficulty && rec.difficulty !== currentFilters.difficulty) {
            return false;
        }
        if (currentFilters.status && rec.status !== currentFilters.status) {
            return false;
        }
        return true;
    });
}

/**
 * Actualiza los criterios de filtro activos.
 */
export function setFilters(newFilters) {
    currentFilters = { ...currentFilters, ...newFilters };
    paginationState.currentPage = 1;
}

/**
 * Obtiene los registros correspondientes a la página actual.
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
 */
export function setPage(page) {
    paginationState.currentPage = page;
}

/**
 * Renderiza una única cuadrícula 9x9 limpia.
 * @param {string} boardStr - Cadena de 81 caracteres.
 * @param {boolean} isSolution - Si es true, resalta con estilo de solución.
 */
function renderSingleBoard(boardStr, isSolution = false) {
    const container = document.createElement('div');
    container.className = 'sudoku-grid-wrapper';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';

    const title = document.createElement('h4');
    title.textContent = isSolution ? 'Solución Completa' : 'Tablero Inicial (Pistas)';
    title.style.marginBottom = '0.5rem';
    title.style.color = isSolution ? '#2e7d32' : '#5c3a21';
    title.style.fontSize = '0.95rem';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(9, 28px)';
    grid.style.gap = '1px';
    grid.style.backgroundColor = '#b08d57';
    grid.style.padding = '3px';
    grid.style.borderRadius = '4px';
    grid.style.border = '2px solid #5c3a21';

    try {
        const matrix = boardStringToMatrix(boardStr);

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.style.width = '28px';
                cell.style.height = '28px';
                cell.style.backgroundColor = '#fff';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontWeight = 'bold';
                cell.style.fontSize = '13px';

                // Divisiones de cajas 3x3
                if ((c + 1) % 3 === 0 && c < 8) cell.style.borderRight = '2px solid #5c3a21';
                if ((r + 1) % 3 === 0 && r < 8) cell.style.borderBottom = '2px solid #5c3a21';

                const val = matrix[r][c];
                if (val !== '0') {
                    cell.textContent = val;
                    cell.style.color = isSolution ? '#1b5e20' : '#2c1810';
                    if (!isSolution) cell.style.backgroundColor = '#f4efe9';
                } else {
                    cell.textContent = ''; // Totalmente vacío en el tablero de juego
                }

                grid.appendChild(cell);
            }
        }
    } catch (e) {
        grid.textContent = 'Error al renderizar.';
    }

    container.appendChild(grid);
    return container;
}

/**
 * Renderiza los DUAL BOARDS (Tablero de Juego + Tablero de Solución).
 */
export function renderSudokuDualPreview(puzzleStr, solutionStr) {
    const dualContainer = document.createElement('div');
    dualContainer.style.display = 'flex';
    dualContainer.style.gap = '1.5rem';
    dualContainer.style.justifyContent = 'center';
    dualContainer.style.flexWrap = 'wrap';
    dualContainer.style.padding = '0.5rem';

    const puzzleGrid = renderSingleBoard(puzzleStr, false);
    const solutionGrid = renderSingleBoard(solutionStr, true);

    dualContainer.appendChild(puzzleGrid);
    dualContainer.appendChild(solutionGrid);

    return dualContainer;
}
