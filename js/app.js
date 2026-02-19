// Estado de la aplicación
let currentPage = 'dashboard';
let vehicles = [];
let charts = {};
let currentCharts = []; // Para mantener referencia de los gráficos

// Estado para búsqueda y filtrado
let searchTerm = '';
let filterType = '';
let filterStatus = '';
let currentPageVehicles = 1;
const vehiclesPerPage = 10;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebaseListeners();
    updateConnectionStatus();
    loadPage('dashboard');
});

// Firebase listeners
function initializeFirebaseListeners() {
    vehiclesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        vehicles = data ? Object.keys(data).map(key => ({
            firebaseKey: key,
            id: key,
            ...data[key]
        })) : [];
        
        // Ordenar por fecha descendente
        vehicles.sort((a, b) => {
            return new Date(b.fechaRegistro) - new Date(a.fechaRegistro);
        });
        
        updateUI();
    }, (error) => {
        showToast('Error de conexión: ' + error.message, 'error');
    });
}

// Estado de conexión
function updateConnectionStatus() {
    const connectedRef = database.ref('.info/connected');
    const statusEl = document.getElementById('connectionStatus');
    
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            statusEl.className = 'connection-status connected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i>';
            showToast('Conectado a Firebase', 'success');
        } else {
            statusEl.className = 'connection-status disconnected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i>';
        }
    });
}

// Navegación
function navigateTo(page) {
    currentPage = page;
    
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Cargar página
    loadPage(page);
}

function loadPage(page) {
    const content = document.getElementById('content');
    
    // Destruir gráficos anteriores
    destroyCharts();
    
    switch(page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            setTimeout(() => initializeDashboardCharts(), 100);
            break;
        case 'register':
            openModal();
            break;
        case 'vehicles':
            content.innerHTML = renderVehiclesList();
            break;
        case 'stats':
            content.innerHTML = renderStatistics();
            setTimeout(() => initializeStatisticsCharts(), 100);
            break;
    }
}

// Destruir gráficos anteriores
function destroyCharts() {
    currentCharts.forEach(chart => {
        if (chart) chart.destroy();
    });
    currentCharts = [];
}

// Renderizar Dashboard
function renderDashboard() {
    const stats = calculateStats();
    const totalVehicles = vehicles.length;
    
    return `
        <div class="dashboard-container">
            <div class="stats-grid">
                <div class="neon-card">
                    <div class="card-icon">
                        <i class="fas fa-car"></i>
                    </div>
                    <div class="card-value">${totalVehicles}</div>
                    <div class="card-label">TOTAL VEHÍCULOS</div>
                </div>
                
                <div class="neon-card">
                    <div class="card-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="card-value">${stats.operativos}</div>
                    <div class="card-label">OPERATIVOS</div>
                </div>
                
                <div class="neon-card">
                    <div class="card-icon">
                        <i class="fas fa-tools"></i>
                    </div>
                    <div class="card-value">${stats.mantenimiento}</div>
                    <div class="card-label">MANTENIMIENTO</div>
                </div>
                
                <div class="neon-card">
                    <div class="card-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="card-value">${stats.baja}</div>
                    <div class="card-label">BAJA</div>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>DISTRIBUCIÓN POR ESTADO</h3>
                    <div class="chart-canvas-container">
                        <canvas id="estadoChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3>DISTRIBUCIÓN POR TIPO</h3>
                    <div class="chart-canvas-container">
                        <canvas id="tipoChart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="chart-card">
                <h3>SENSORES INSTALADOS</h3>
                <div class="chart-canvas-container">
                    <canvas id="sensoresChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

// Renderizar Lista de Vehículos con búsqueda y filtros
function renderVehiclesList() {
    const filteredVehicles = filterVehicles();
    const paginatedVehicles = paginateVehicles(filteredVehicles);
    const totalPages = Math.ceil(filteredVehicles.length / vehiclesPerPage);
    
    return `
        <div class="vehicles-list-container">
            <div class="table-toolbar">
                <h2 class="neon-title" style="font-size: 1.4rem;">
                    <i class="fas fa-list"></i> GESTIÓN DE VEHÍCULOS
                </h2>
                <div class="toolbar-actions">
                    <button class="filter-button" onclick="exportToExcel()">
                        <i class="fas fa-file-excel"></i>
                        EXPORTAR EXCEL
                    </button>
                    <button class="filter-button" onclick="importFromExcel()">
                        <i class="fas fa-file-import"></i>
                        IMPORTAR EXCEL
                    </button>
                    <button class="filter-button" onclick="openModal()">
                        <i class="fas fa-plus"></i>
                        NUEVO
                    </button>
                </div>
            </div>
            
            <div class="search-bar">
                <div class="search-input-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" 
                           class="search-input" 
                           placeholder="Buscar por placa, tipo..." 
                           value="${searchTerm}"
                           onkeyup="handleSearch(event)">
                </div>
                
                <div class="filter-group">
                    <select class="filter-select" onchange="filterByType(this.value)">
                        <option value="">Todos los tipos</option>
                        ${getUniqueTypes().map(type => 
                            `<option value="${type}" ${filterType === type ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                    
                    <select class="filter-select" onchange="filterByStatus(this.value)">
                        <option value="">Todos los estados</option>
                        <option value="Operativo" ${filterStatus === 'Operativo' ? 'selected' : ''}>Operativo</option>
                        <option value="Mantenimiento" ${filterStatus === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                        <option value="Baja" ${filterStatus === 'Baja' ? 'selected' : ''}>Baja</option>
                    </select>
                    
                    <button class="filter-button" onclick="clearFilters()">
                        <i class="fas fa-times"></i>
                        LIMPIAR
                    </button>
                </div>
            </div>
            
            ${renderTable(paginatedVehicles)}
            
            ${renderPagination(filteredVehicles.length, totalPages)}
        </div>
    `;
}

// Renderizar tabla
function renderTable(vehiclesToShow) {
    if (vehiclesToShow.length === 0) {
        return `
            <div class="neon-card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-car" style="font-size: 4rem; color: var(--neon-cyan); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 1rem;">No se encontraron vehículos</h3>
                <button class="neon-button primary" onclick="openModal()">
                    <i class="fas fa-plus"></i>
                    REGISTRAR VEHÍCULO
                </button>
            </div>
        `;
    }
    
    return `
        <div class="vehicles-table-container">
            <table class="vehicles-table">
                <thead>
                    <tr>
                        <th>PLACA</th>
                        <th>TIPO</th>
                        <th>ESTADO</th>
                        <th>SENSORES</th>
                        <th>FECHA REGISTRO</th>
                        <th>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    ${vehiclesToShow.map(vehicle => renderTableRow(vehicle)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Renderizar fila de tabla
function renderTableRow(vehicle) {
    const sensores = vehicle.sensores || {};
    const sensoresActivos = [];
    
    if (sensores.camara) sensoresActivos.push('📷 Cámara');
    if (sensores.sensorCombustible) sensoresActivos.push('⛽ Combustible');
    if (sensores.sensorRFID) sensoresActivos.push('📡 RFID');
    if (sensores.ibutton) sensoresActivos.push('🔑 iButton');
    if (sensores.gps) sensoresActivos.push('📍 GPS');
    
    const statusClass = `status-${vehicle.estado?.toLowerCase() || 'operativo'}`;
    const fechaRegistro = vehicle.fechaRegistro ? new Date(vehicle.fechaRegistro).toLocaleDateString() : 'N/A';
    
    return `
        <tr>
            <td><strong style="color: var(--neon-cyan);">${vehicle.placa || 'N/A'}</strong></td>
            <td>${vehicle.tipo || 'N/A'}</td>
            <td><span class="vehicle-status ${statusClass}">${vehicle.estado || 'N/A'}</span></td>
            <td>
                <div class="table-sensors">
                    ${sensoresActivos.length > 0 ? 
                        sensoresActivos.map(s => `<span class="sensor-badge">${s}</span>`).join('') : 
                        '<span class="sensor-badge">Sin sensores</span>'
                    }
                </div>
            </td>
            <td>${fechaRegistro}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="neon-button small" onclick="editVehicle('${vehicle.firebaseKey || vehicle.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="neon-button small" onclick="deleteVehicle('${vehicle.firebaseKey || vehicle.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Renderizar paginación
function renderPagination(totalItems, totalPages) {
    if (totalItems === 0) return '';
    
    return `
        <div class="pagination">
            <button class="pagination-button" 
                    onclick="changePage(currentPageVehicles - 1)"
                    ${currentPageVehicles === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            
            ${generatePageButtons(totalPages)}
            
            <button class="pagination-button"
                    onclick="changePage(currentPageVehicles + 1)"
                    ${currentPageVehicles === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
            
            <span class="pagination-info">
                Mostrando ${((currentPageVehicles - 1) * vehiclesPerPage) + 1} - 
                ${Math.min(currentPageVehicles * vehiclesPerPage, totalItems)} de ${totalItems}
            </span>
        </div>
    `;
}

// Generar botones de página
function generatePageButtons(totalPages) {
    let buttons = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPageVehicles - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        buttons += `
            <button class="pagination-button ${i === currentPageVehicles ? 'active' : ''}"
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    return buttons;
}

// Funciones de filtrado y paginación
function filterVehicles() {
    return vehicles.filter(vehicle => {
        // Búsqueda por texto
        const matchesSearch = searchTerm === '' || 
            (vehicle.placa && vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (vehicle.tipo && vehicle.tipo.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Filtro por tipo
        const matchesType = filterType === '' || vehicle.tipo === filterType;
        
        // Filtro por estado
        const matchesStatus = filterStatus === '' || vehicle.estado === filterStatus;
        
        return matchesSearch && matchesType && matchesStatus;
    });
}

function paginateVehicles(filteredVehicles) {
    const startIndex = (currentPageVehicles - 1) * vehiclesPerPage;
    return filteredVehicles.slice(startIndex, startIndex + vehiclesPerPage);
}

function handleSearch(event) {
    searchTerm = event.target.value;
    currentPageVehicles = 1;
    loadPage('vehicles');
}

function filterByType(type) {
    filterType = type;
    currentPageVehicles = 1;
    loadPage('vehicles');
}

function filterByStatus(status) {
    filterStatus = status;
    currentPageVehicles = 1;
    loadPage('vehicles');
}

function clearFilters() {
    searchTerm = '';
    filterType = '';
    filterStatus = '';
    currentPageVehicles = 1;
    loadPage('vehicles');
}

function changePage(page) {
    currentPageVehicles = page;
    loadPage('vehicles');
}

function getUniqueTypes() {
    return [...new Set(vehicles.map(v => v.tipo).filter(Boolean))];
}

// Renderizar Estadísticas
function renderStatistics() {
    return `
        <div class="dashboard-container">
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>JERARQUÍA TIPO-ESTADO</h3>
                    <div class="chart-canvas-container">
                        <canvas id="sunburstChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3>CORRELACIÓN DE SENSORES</h3>
                    <div class="chart-canvas-container">
                        <canvas id="correlationChart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="chart-card">
                <h3>COMBINACIONES DE SENSORES</h3>
                <div class="chart-canvas-container">
                    <canvas id="combinationsChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

// Inicializar gráficos del Dashboard
function initializeDashboardCharts() {
    if (vehicles.length === 0) return;
    
    // Destruir gráficos anteriores
    destroyCharts();
    
    // Gráfico de Estados
    const estadoCanvas = document.getElementById('estadoChart');
    if (estadoCanvas) {
        const estadoCtx = estadoCanvas.getContext('2d');
        const estadoCounts = {
            'Operativo': vehicles.filter(v => v.estado === 'Operativo').length,
            'Mantenimiento': vehicles.filter(v => v.estado === 'Mantenimiento').length,
            'Baja': vehicles.filter(v => v.estado === 'Baja').length
        };
        
        const chart = new Chart(estadoCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(estadoCounts),
                datasets: [{
                    data: Object.values(estadoCounts),
                    backgroundColor: [
                        'rgba(0, 255, 255, 0.8)',
                        'rgba(255, 255, 0, 0.8)',
                        'rgba(255, 0, 255, 0.8)'
                    ],
                    borderColor: [
                        '#00ffff',
                        '#ffff00',
                        '#ff00ff'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
    
    // Gráfico de Tipos
    const tipoCanvas = document.getElementById('tipoChart');
    if (tipoCanvas) {
        const tipoCtx = tipoCanvas.getContext('2d');
        const tipoCounts = {};
        vehicles.forEach(v => {
            if (v.tipo) {
                tipoCounts[v.tipo] = (tipoCounts[v.tipo] || 0) + 1;
            }
        });
        
        const chart = new Chart(tipoCtx, {
            type: 'polarArea',
            data: {
                labels: Object.keys(tipoCounts),
                datasets: [{
                    data: Object.values(tipoCounts),
                    backgroundColor: [
                        'rgba(0, 255, 255, 0.6)',
                        'rgba(255, 0, 255, 0.6)',
                        'rgba(153, 0, 255, 0.6)',
                        'rgba(0, 255, 157, 0.6)',
                        'rgba(255, 255, 0, 0.6)'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
    
    // Gráfico de Sensores
    const sensoresCanvas = document.getElementById('sensoresChart');
    if (sensoresCanvas) {
        const sensoresCtx = sensoresCanvas.getContext('2d');
        const sensoresCount = {
            'Cámara': 0,
            'Sensor Combustible': 0,
            'Sensor RFID': 0,
            'iButton': 0,
            'GPS': 0
        };
        
        vehicles.forEach(v => {
            const sensores = v.sensores || {};
            if (sensores.camara) sensoresCount['Cámara']++;
            if (sensores.sensorCombustible) sensoresCount['Sensor Combustible']++;
            if (sensores.sensorRFID) sensoresCount['Sensor RFID']++;
            if (sensores.ibutton) sensoresCount['iButton']++;
            if (sensores.gps) sensoresCount['GPS']++;
        });
        
        const chart = new Chart(sensoresCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(sensoresCount),
                datasets: [{
                    label: 'Cantidad de vehículos',
                    data: Object.values(sensoresCount),
                    backgroundColor: 'rgba(0, 255, 255, 0.8)',
                    borderColor: '#00ffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            color: '#ffffff',
                            stepSize: 1
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: '#ffffff' },
                        grid: { display: false }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

// Inicializar gráficos de Estadísticas
function initializeStatisticsCharts() {
    if (vehicles.length === 0) return;
    
    destroyCharts();
    
    // Gráfico de combinaciones de sensores
    const combinationsCanvas = document.getElementById('combinationsChart');
    if (combinationsCanvas) {
        const combinations = {};
        
        vehicles.forEach(v => {
            const sensores = v.sensores || {};
            const key = Object.keys(sensores)
                .filter(s => sensores[s])
                .sort()
                .join(' + ') || 'Sin sensores';
            
            combinations[key] = (combinations[key] || 0) + 1;
        });
        
        const sortedCombinations = Object.entries(combinations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8); // Top 8 combinaciones
        
        const chart = new Chart(combinationsCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedCombinations.map(c => c[0]),
                datasets: [{
                    label: 'Cantidad de vehículos',
                    data: sortedCombinations.map(c => c[1]),
                    backgroundColor: 'rgba(255, 0, 255, 0.8)',
                    borderColor: '#ff00ff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: '#ffffff' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: {
                        ticks: { color: '#ffffff' },
                        grid: { display: false }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

// Calcular estadísticas
function calculateStats() {
    return {
        total: vehicles.length,
        operativos: vehicles.filter(v => v.estado === 'Operativo').length,
        mantenimiento: vehicles.filter(v => v.estado === 'Mantenimiento').length,
        baja: vehicles.filter(v => v.estado === 'Baja').length
    };
}

// Actualizar UI después de cambios
function updateUI() {
    if (currentPage === 'dashboard') {
        document.getElementById('content').innerHTML = renderDashboard();
        setTimeout(() => initializeDashboardCharts(), 100);
    } else if (currentPage === 'vehicles') {
        document.getElementById('content').innerHTML = renderVehiclesList();
    } else if (currentPage === 'stats') {
        document.getElementById('content').innerHTML = renderStatistics();
        setTimeout(() => initializeStatisticsCharts(), 100);
    }
}

// Funciones de Excel
function exportToExcel() {
    if (vehicles.length === 0) {
        showToast('No hay datos para exportar', 'error');
        return;
    }
    
    // Preparar datos para Excel
    const excelData = vehicles.map(v => ({
        'PLACA': v.placa || '',
        'TIPO': v.tipo || '',
        'ESTADO': v.estado || '',
        'CÁMARA': v.sensores?.camara ? 'SÍ' : 'NO',
        'SENSOR COMBUSTIBLE': v.sensores?.sensorCombustible ? 'SÍ' : 'NO',
        'SENSOR RFID': v.sensores?.sensorRFID ? 'SÍ' : 'NO',
        'iBUTTON': v.sensores?.ibutton ? 'SÍ' : 'NO',
        'GPS': v.sensores?.gps ? 'SÍ' : 'NO',
        'FECHA REGISTRO': v.fechaRegistro ? new Date(v.fechaRegistro).toLocaleDateString() : '',
        'FECHA ACTUALIZACIÓN': v.fechaActualizacion ? new Date(v.fechaActualizacion).toLocaleDateString() : ''
    }));
    
    // Crear CSV
    const headers = Object.keys(excelData[0]);
    const csvContent = [
        headers.join(','),
        ...excelData.map(row => headers.map(header => {
            const cell = row[header] || '';
            return cell.includes(',') ? `"${cell}"` : cell;
        }).join(','))
    ].join('\n');
    
    // Descargar archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vehiculos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Datos exportados correctamente', 'success');
}

function importFromExcel() {
    // Crear input de archivo temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx, .xls';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                let imported = 0;
                let errors = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    try {
                        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const rowData = {};
                        headers.forEach((header, index) => {
                            rowData[header] = values[index] || '';
                        });
                        
                        // Mapear datos al formato de la app
                        const vehicleData = {
                            placa: rowData['PLACA'] || '',
                            tipo: rowData['TIPO'] || 'Otro',
                            estado: rowData['ESTADO'] || 'Operativo',
                            sensores: {
                                camara: rowData['CÁMARA']?.toUpperCase() === 'SÍ',
                                sensorCombustible: rowData['SENSOR COMBUSTIBLE']?.toUpperCase() === 'SÍ',
                                sensorRFID: rowData['SENSOR RFID']?.toUpperCase() === 'SÍ',
                                ibutton: rowData['iBUTTON']?.toUpperCase() === 'SÍ',
                                gps: rowData['GPS']?.toUpperCase() === 'SÍ'
                            },
                            fechaRegistro: new Date().toISOString(),
                            fechaActualizacion: new Date().toISOString()
                        };
                        
                        // Validar datos mínimos
                        if (vehicleData.placa) {
                            await vehiclesRef.push(vehicleData);
                            imported++;
                        } else {
                            errors++;
                        }
                    } catch (err) {
                        console.error('Error procesando fila:', err);
                        errors++;
                    }
                }
                
                showToast(`Importación completada: ${imported} exitosos, ${errors} errores`, 
                         errors === 0 ? 'success' : 'error');
                
            } catch (err) {
                showToast('Error al procesar el archivo: ' + err.message, 'error');
            }
        };
        
        reader.readAsText(file, 'UTF-8');
    };
    
    input.click();
}

// Manejar formulario
function handleSubmit(event) {
    event.preventDefault();
    
    const firebaseKey = document.getElementById('firebaseKey').value;
    
    const vehicleData = {
        placa: document.getElementById('placa').value.toUpperCase(),
        tipo: document.getElementById('tipo').value,
        estado: document.getElementById('estado').value,
        sensores: {
            camara: document.getElementById('camara').checked,
            sensorCombustible: document.getElementById('sensorCombustible').checked,
            sensorRFID: document.getElementById('sensorRFID').checked,
            ibutton: document.getElementById('ibutton').checked,
            gps: document.getElementById('gps').checked
        },
        fechaActualizacion: new Date().toISOString()
    };
    
    if (firebaseKey) {
        // Actualizar existente
        vehiclesRef.child(firebaseKey).update(vehicleData)
            .then(() => {
                showToast('Vehículo actualizado correctamente', 'success');
                closeModal();
            })
            .catch(error => {
                showToast('Error al actualizar: ' + error.message, 'error');
            });
    } else {
        // Nuevo vehículo
        vehicleData.fechaRegistro = new Date().toISOString();
        vehiclesRef.push(vehicleData)
            .then(() => {
                showToast('Vehículo registrado correctamente', 'success');
                closeModal();
            })
            .catch(error => {
                showToast('Error al guardar: ' + error.message, 'error');
            });
    }
}

// Editar vehículo
function editVehicle(id) {
    const vehicle = vehicles.find(v => v.firebaseKey === id || v.id === id);
    if (!vehicle) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Vehículo';
    document.getElementById('firebaseKey').value = vehicle.firebaseKey || vehicle.id;
    document.getElementById('placa').value = vehicle.placa || '';
    document.getElementById('tipo').value = vehicle.tipo || '';
    document.getElementById('estado').value = vehicle.estado || '';
    
    const sensores = vehicle.sensores || {};
    document.getElementById('camara').checked = sensores.camara || false;
    document.getElementById('sensorCombustible').checked = sensores.sensorCombustible || false;
    document.getElementById('sensorRFID').checked = sensores.sensorRFID || false;
    document.getElementById('ibutton').checked = sensores.ibutton || false;
    document.getElementById('gps').checked = sensores.gps || false;
    
    openModal();
}

// Eliminar vehículo
function deleteVehicle(id) {
    if (confirm('¿Estás seguro de eliminar este vehículo?')) {
        vehiclesRef.child(id).remove()
            .then(() => {
                showToast('Vehículo eliminado correctamente', 'success');
            })
            .catch(error => {
                showToast('Error al eliminar: ' + error.message, 'error');
            });
    }
}

// Modal functions
function openModal() {
    document.getElementById('vehicleModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('vehicleModal').style.display = 'none';
    document.getElementById('vehicleForm').reset();
    document.getElementById('firebaseKey').value = '';
    document.getElementById('modalTitle').textContent = 'Registrar Vehículo';
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    toast.className = `neon-toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Refresh data
function refreshData() {
    showToast('Actualizando datos...', 'info');
}

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('vehicleModal');
    if (event.target === modal) {
        closeModal();
    }
};