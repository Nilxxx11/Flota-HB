// Importar los módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBz9VDD17ZiieA9lkSViIZts7TiYE2a4yE",
    authDomain: "crud-85196.firebaseapp.com",
    databaseURL: "https://crud-85196-default-rtdb.firebaseio.com",
    projectId: "crud-85196",
    storageBucket: "crud-85196.appspot.com",
    messagingSenderId: "340343732832",
    appId: "1:340343732832:web:af3aaddbef9d5c3a092105"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Referencias a elementos del DOM
const openModal = document.getElementById('nuevo');
const modal = document.getElementById('modal');
const cancel = document.getElementById('cancel');
const form = document.getElementById('register-form');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const exportExcelButton = document.getElementById('export-excel');
const tbody = document.querySelector('tbody');

// Variables globales
let editKey = null;
let allStudents = {};

// Función para mostrar/ocultar el modal
const showRegisterModal = () => {
    form.reset();
    editKey = null;
    modal.classList.toggle('is-active');
};

// Event listeners para abrir/cerrar el modal
openModal.addEventListener("click", showRegisterModal);
cancel.addEventListener("click", showRegisterModal);

// Función para manejar el envío del formulario
const handleFormSubmit = (e) => {
    e.preventDefault();

    const placa = form['placa'].value.trim();
    const rif = form['rif'].value.trim();
    const gps = form['gps'].value.trim();
    const camara = form['camara'].value.trim();
    const kilometraje = form['kilometraje'].value.trim();
    const detalles = form['detalles'].value.trim();

    const currentDate = new Date();
    const fecha = currentDate.toLocaleDateString();

    const estudiante = { placa, rif, gps, camara, kilometraje, fecha, detalles };

    if (editKey) {
        update(ref(database, `/${editKey}`), estudiante)
            .then(() => {
                console.log('Vehículo actualizado correctamente');
                modal.classList.remove('is-active');
                loadStudents();
            })
            .catch(console.error);
    } else {
        const databaseRef = ref(database, '/');
        push(databaseRef, estudiante)
            .then(() => {
                console.log('Vehículo añadido correctamente');
                modal.classList.remove('is-active');
                loadStudents();
            })
            .catch(console.error);
    }
};

// Función para renderizar los vehículos en la tabla
const renderStudents = (students) => {
    tbody.innerHTML = '';
    let countWithRif = 0, countWithGPS = 0, countWithCamera = 0, countWithKilometraje = 0, countWithoutKilometraje = 0;

    if (!students || Object.keys(students).length === 0) {
        updateCounters(countWithRif, countWithGPS, countWithCamera, countWithKilometraje, countWithoutKilometraje);
        return;
    }

    Object.entries(students).forEach(([key, student]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.placa}</td>
            <td>${student.rif}</td>
            <td>${student.gps}</td>
            <td>${student.camara}</td>
            <td>${student.kilometraje}</td>
            <td>${student.fecha}</td>
            <td>${student.detalles}</td>
            <td>
                <button class="button is-warning is-dark is-small" data-key="${key}">E</button>
                <button class="button is-danger is-dark is-small" data-key="${key}">X</button>
            </td>
        `;
        tbody.appendChild(tr);

        if (student.rif === 'si') countWithRif++;
        if (student.gps === 'si') countWithGPS++;
        if (student.camara === 'si') countWithCamera++;
        if (student.kilometraje && student.kilometraje !== "") {
            countWithKilometraje++;
        } else {
            countWithoutKilometraje++;
        }
    });

    updateCounters(countWithRif, countWithGPS, countWithCamera, countWithKilometraje, countWithoutKilometraje);

    tbody.addEventListener('click', (e) => {
        const key = e.target.getAttribute('data-key');
        if (e.target.classList.contains('is-warning')) {
            editKey = key;
            const student = students[key];
            form['placa'].value = student.placa;
            form['rif'].value = student.rif;
            form['gps'].value = student.gps;
            form['camara'].value = student.camara;
            form['kilometraje'].value = student.kilometraje;
            form['detalles'].value = student.detalles;
            modal.classList.add('is-active');
        }
        if (e.target.classList.contains('is-danger')) {
            remove(ref(database, `/${key}`))
                .then(() => console.log('Vehículo eliminado correctamente'))
                .catch(console.error);
        }
    });
};

// Función para actualizar los contadores
const updateCounters = (rif, gps, camera, withKm, withoutKm) => {
    document.getElementById('rif-counter').innerText = `Con Rif: ${rif}`;
    document.getElementById('gps-counter').innerText = `Con GPS: ${gps}`;
    document.getElementById('camera-counter').innerText = `Con Cámara: ${camera}`;
    document.getElementById('with-kilometraje').innerText = `Con Kilometraje: ${withKm}`;
    document.getElementById('without-kilometraje').innerText = `Sin Kilometraje: ${withoutKm}`;
};

// Función para exportar datos a Excel
const exportToExcel = () => {
    const data = Object.values(allStudents);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, 'Datos.xlsx');
};

// Cargar los datos desde Firebase
const loadStudents = () => {
    const databaseRef = ref(database, '/');
    onValue(databaseRef, (snapshot) => {
        const data = snapshot.val();
        allStudents = data || {};
        renderStudents(allStudents);
    }, (error) => console.error('Error al cargar los datos:', error));
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    form.addEventListener('submit', handleFormSubmit);
    exportExcelButton.addEventListener('click', exportToExcel);
    loadStudents();
});
