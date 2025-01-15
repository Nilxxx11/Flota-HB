// Importar los módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

// Configuración de Firebase (reemplaza con tus credenciales)
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

// Variables globales
let countWithRif = 0;
let countWithGPS = 0;
let countWithCamera = 0;
let countWithKilometraje = 0;
let countWithoutKilometraje = 0;
let editKey = null;

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

    const placa = form['placa'].value;
    const rif = form['rif'].value;
    const gps = form['gps'].value;
    const camara = form['camara'].value;
    const kilometraje = form['kilometraje'].value;
    const detalles = form['detalles'].value;

    const currentDate = new Date();
    const fecha = currentDate.toLocaleDateString();

    const estudiante = {
        placa,
        rif,
        gps,
        camara,
        kilometraje,
        fecha,
        detalles,
    };

    if (editKey) {
        update(ref(database, `/${editKey}`), estudiante)
            .then(() => {
                console.log('Vehículo actualizado correctamente');
                editKey = null;
                modal.classList.remove('is-active');
                getStudentsSnapshot().then(renderStudents).catch(console.error);
            })
            .catch(console.error);
    } else {
        const databaseRef = ref(database, '/');
        get(databaseRef)
            .then((snapshot) => {
                const data = snapshot.val();
                const placasExistentes = data ? Object.values(data).map(item => item.placa) : [];
                if (placasExistentes.includes(placa)) {
                    alert('Esta placa ya está registrada.');
                } else {
                    push(databaseRef, estudiante)
                        .then(() => {
                            console.log('Vehículo añadido correctamente');
                            modal.classList.remove('is-active');
                            getStudentsSnapshot().then(renderStudents).catch(console.error);
                        })
                        .catch(console.error);
                }
            })
            .catch(console.error);
    }
};

// Función para renderizar los vehículos en la tabla
const renderStudents = (students) => {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    // Reiniciar contadores
    countWithRif = 0;
    countWithGPS = 0;
    countWithCamera = 0;
    countWithKilometraje = 0;
    countWithoutKilometraje = 0;

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

        // Actualizar contadores
        if (student.rif === 'si') countWithRif++;
        if (student.gps === 'si') countWithGPS++;
        if (student.camara === 'si') countWithCamera++;
        if (student.kilometraje && student.kilometraje !== "") {
            countWithKilometraje++;
        } else {
            countWithoutKilometraje++;
        }
    });

    // Mostrar contadores
    document.getElementById('rif-counter').innerText = `Con Rif: ${countWithRif}`;
    document.getElementById('gps-counter').innerText = `Con GPS: ${countWithGPS}`;
    document.getElementById('camera-counter').innerText = `Con Cámara: ${countWithCamera}`;
    document.getElementById('with-kilometraje').innerText = `Con Kilometraje: ${countWithKilometraje}`;
    document.getElementById('without-kilometraje').innerText = `Sin Kilometraje: ${countWithoutKilometraje}`;
};

// Función para obtener los datos de Firebase
const getStudentsSnapshot = () => {
    return new Promise((resolve, reject) => {
        onValue(ref(database, '/'), (snapshot) => {
            const data = snapshot.val();
            resolve(data || {});
        }, (error) => {
            reject(error);
        });
    });
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    form.addEventListener('submit', handleFormSubmit);
    exportExcelButton.addEventListener('click', exportToExcel);
    searchButton.addEventListener('click', () => {
        const searchText = searchInput.value.trim();
        getStudentsSnapshot()
            .then((students) => {
                const filteredStudents = Object.entries(students)
                    .filter(([key, student]) => student.placa.toLowerCase().includes(searchText.toLowerCase()))
                    .reduce((acc, [key, student]) => ({ ...acc, [key]: student }), {});
                renderStudents(filteredStudents);
            })
            .catch(console.error);
    });

    getStudentsSnapshot().then(renderStudents).catch(console.error);
});