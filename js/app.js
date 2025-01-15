// Importar los módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

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
let allStudents = {}; // Almacenará todos los datos de Firebase
let editKey = null;

// Función para mostrar/ocultar el modal
const toggleModal = () => {
    form.reset();
    editKey = null;
    modal.classList.toggle('is-active');
};

// Event listeners para abrir/cerrar el modal
openModal.addEventListener("click", toggleModal);
cancel.addEventListener("click", toggleModal);

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
            })
            .catch(console.error);
    } else {
        const databaseRef = ref(database, '/');
        push(databaseRef, estudiante)
            .then(() => {
                console.log('Vehículo añadido correctamente');
                modal.classList.remove('is-active');
            })
            .catch(console.error);
    }
};

// Función para renderizar los vehículos en la tabla
const renderStudents = (students) => {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    if (!students || Object.keys(students).length === 0) {
        console.log('No hay datos para mostrar');
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
    });

    // Agregar eventos a los botones de edición y eliminación
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

// Función para cargar los datos de Firebase
const loadStudents = () => {
    const databaseRef = ref(database, '/');
    onValue(databaseRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Datos recuperados:', data);
        allStudents = data || {};
        renderStudents(allStudents);
    }, (error) => {
        console.error('Error al cargar los datos:', error);
    });
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    form.addEventListener('submit', handleFormSubmit);

    // Cargar los datos al iniciar
    loadStudents();

    // Buscar al hacer clic en el botón de búsqueda
    searchButton.addEventListener('click', () => {
        const searchText = searchInput.value.trim().toLowerCase();
        const filteredStudents = Object.entries(allStudents)
            .filter(([_, student]) => student.placa.toLowerCase().includes(searchText))
            .reduce((acc, [key, student]) => ({ ...acc, [key]: student }), {});
        renderStudents(filteredStudents);
    });
});
