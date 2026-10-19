/**
 * ChocoDoku - main.js
 * Coordinador principal, manejo de eventos de UI y sincronización de módulos.
 */

import { getActiveMaster, importMasterJSON } from './data-manager.js';
import { rebuildGlobalIndexFromMasters } from './duplicate-index.js';
import { generateBatch } from './generator.js';
import { getPaginatedRecords, setFilters, renderSudokuPreview } from './reviewer.js';
import { generateExportFile } from './exporter.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("🍫 ChocoDoku inicializado correctamente.");

    // --- 1. NAVEGACIÓN ENTRE VISTAS (PESTAÑAS) ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            
            navButtons.forEach(b => b.classList.remove('active'));
            viewSections.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.add('active');
                if (targetId === 'view-checker') {
                    refreshReviewerTable();
                }
            }
        });
    });

    // --- 2. GESTIÓN DE DATOS Y MASTERS ---
    const importMasterInput = document.getElementById('import-master-file');
    if (importMasterInput) {
        importMasterInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    const res = importMasterJSON(json);
                    alert(`Master importado con éxito: ${res.collectionId} (${res.volumeId}) - ${res.totalRecords} registros.`);
                    updateGlobalStatusIndicators();
                    refreshReviewerTable();
                } catch (err) {
                    alert(`Error al importar Master: ${err.message}`);
                }
            };
            reader.readAsText(file);
        });
    }

    const btnRebuildIndex = document.getElementById('btn-rebuild-index');
    if (btnRebuildIndex) {
        btnRebuildIndex.addEventListener('click', () => {
            const currentMaster = getActiveMaster();
            const res = rebuildGlobalIndexFromMasters([currentMaster]);
            alert(`Índice global reconstruido con éxito. Puzzles indexados: ${res.totalIndexed}.`);
            updateGlobalStatusIndicators();
        });
    }

    // --- 3. EVENTO DE GENERACIÓN POR LOTES ---
    const generatorForm = document.getElementById('generator-form');
    const btnStartGen = document.getElementById('btn-start-generation');

    if (generatorForm) {
        generatorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const collectionId = document.getElementById('gen-collection').value;
            const volumeId = document.getElementById('gen-volume').value;
            const seed = document.getElementById('gen-seed').value;
            
            const counts = {
                Easy: parseInt(document.getElementById('qty-easy').value, 10) || 0,
                Medium: parseInt(document.getElementById('qty-medium').value, 10) || 0,
                Hard: parseInt(document.getElementById('qty-hard').value, 10) || 0,
                Expert: parseInt(document.getElementById('qty-expert').value, 10) || 0
            };

            const progressArea = document.getElementById('generation-progress-area');
            progressArea.innerHTML = `<p>Generando lote... Por favor espere.</p>`;
            btnStartGen.setAttribute('disabled', 'true');

            try {
                const summary = await generateBatch({ collectionId, volumeId, seed, counts }, (progressInfo) => {
                    progressArea.innerHTML = `
                        <p><strong>Generando [${progressInfo.currentDifficulty}]:</strong> ${progressInfo.progress} / ${progressInfo.target}</p>
                        <p>Aceptados Totales: Easy(${progressInfo.summary.accepted.Easy}) Medium(${progressInfo.summary.accepted.Medium}) Hard(${progressInfo.summary.accepted.Hard}) Expert(${progressInfo.summary.accepted.Expert})</p>
                        <p>Rechazados / Duplicados: ${progressInfo.summary.rejected} / ${progressInfo.summary.duplicates}</p>
                    `;
                });

                progressArea.innerHTML += `
                    <p style="color: green; margin-top: 1rem;"><strong>¡Generación completada con éxito!</strong></p>
                    <p>Total aceptados: ${Object.values(summary.accepted).reduce((a, b) => a + b, 0)}</p>
                `;
                updateGlobalStatusIndicators();
                refreshReviewerTable();
            } catch (err) {
                progressArea.innerHTML += `<p style="color: red;">Error en generación: ${err.message}</p>`;
            } finally {
                btnStartGen.removeAttribute('disabled');
            }
        });
    }

    // --- 4. CHECKER & REVIEWER (FILTROS) ---
    const filterIdInput = document.getElementById('filter-id');
    const filterDifficultySelect = document.getElementById('filter-difficulty');
    const filterStatusSelect = document.getElementById('filter-status');

    const triggerFilterUpdate = () => {
        setFilters({
            searchId: filterIdInput ? filterIdInput.value : "",
            difficulty: filterDifficultySelect ? filterDifficultySelect.value : "",
            status: filterStatusSelect ? filterStatusSelect.value : ""
        });
        refreshReviewerTable();
    };

    if (filterIdInput) filterIdInput.addEventListener('input', triggerFilterUpdate);
    if (filterDifficultySelect) filterDifficultySelect.addEventListener('change', triggerFilterUpdate);
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', triggerFilterUpdate);

    // --- 5. EXPORTER (DESCARGA DE ARCHIVOS) ---
    const exportBtn = document.getElementById('btn-execute-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const formatSelect = document.getElementById('export-format');
            const format = formatSelect ? formatSelect.value : 'indesign-grid';
            
            const scopeRadios = document.querySelectorAll('input[name="export-scope"]');
            let scope = 'filtered';
            scopeRadios.forEach(r => {
                if (r.checked) scope = r.value;
            });
            
            try {
                const { blob, filename, count } = generateExportFile(format, scope);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert(`Exportación generada con éxito: ${filename} (${count} registros).`);
            } catch (err) {
                alert(`Error al exportar: ${err.message}`);
            }
        });
    }

    updateGlobalStatusIndicators();
});

function updateGlobalStatusIndicators() {
    const master = getActiveMaster();
    const masterStatus = document.getElementById('master-status');
    const indexStatus = document.getElementById('index-status');

    if (masterStatus) {
        masterStatus.textContent = `Master: ${master.volumeId} (${master.records.length} regs)`;
        masterStatus.className = "status-indicator success";
    }
    if (indexStatus) {
        indexStatus.textContent = `Índice Global Activo`;
        indexStatus.className = "status-indicator success";
    }
}

function refreshReviewerTable() {
    const tbody = document.querySelector('#puzzles-table tbody');
    if (!tbody) return;

    const { records } = getPaginatedRecords();

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No se encontraron registros. Genera un lote primero.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    records.forEach(rec => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.id}</strong></td>
            <td>${rec.collectionId} / ${rec.volumeId}</td>
            <td><span>${rec.difficulty}</span></td>
            <td>${rec.status}</td>
            <td><button class="btn secondary btn-sm view-detail-btn" data-id="${rec.id}">Ver Detalle</button></td>
        `;

        tr.querySelector('.view-detail-btn').addEventListener('click', () => {
            const previewArea = document.getElementById('puzzle-preview-grid');
            previewArea.innerHTML = '';
            const gridEl = renderSudokuPreview(rec.puzzle, rec.solution);
            previewArea.appendChild(gridEl);
        });

        tbody.appendChild(tr);
    });
}