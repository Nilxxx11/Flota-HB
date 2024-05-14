// Importar los módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

// Constantes con los id de los botones y modal
const openModal = document.getElementById('nuevo');
const modal = document.getElementById('modal');
const cancel = document.getElementById('cancel');
const form = document.getElementById('register-form');

let countWithRif = 0;
let countWithGPS = 0;
let countWithCamera = 0;

// Variable global para almacenar la clave del registro que se está editando
let editKey = null;

// Función para mostrar modal
const showRegisterModal = () => {
  // Limpiar los campos del formulario
  form.reset();
  
  // Restablecer la clave de edición
  editKey = null;

  // Mostrar/ocultar el modal
  modal.classList.toggle('is-active');
};

// Detecta los click a los botones y llaman a la función
openModal.addEventListener("click", showRegisterModal);
cancel.addEventListener("click", showRegisterModal);

// Función para manejar la edición de estudiantes
const handleEditStudent = (key) => {
  const studentRef = ref(getDatabase(), `/${key}`);

  try {
    // Obtener datos del estudiante una vez
    get(studentRef)
      .then((snapshot) => {
        const student = snapshot.val();

        // Verificar si se obtuvieron los datos correctamente
        if (student) {
          // Precargar los campos del formulario con los datos del estudiante
          form['placa'].value = student.placa;
          form['rif'].value = student.rif;
          form['gps'].value = student.gps;
          form['camara'].value = student.camara;
          form['detalles'].value = student.detalles;

          // Asignar la clave del registro que se está editando
          editKey = key;

          // Mostrar el modal
          modal.classList.add('is-active');
        } else {
          console.error('No se encontraron datos para el estudiante con la clave:', key);
        }
      })
      .catch((error) => {
        console.error('Error al obtener datos del estudiante: ', error);
      });
  } catch (error) {
    console.error('Error al obtener datos del estudiante:', error);
  }
};

// Función para manejar la eliminación de estudiantes
const handleDeleteStudent = (key) => {
  const studentRef = ref(getDatabase(), `/${key}`);

  remove(studentRef)
    .then(() => {
      console.log('Estudiante eliminado correctamente');
      getStudentsSnapshot().then((students) => {
        renderStudents(students); // Actualiza la tabla
      }).catch((error) => {
        console.error('Error al obtener estudiantes: ', error);
      });
    })
    .catch((error) => {
      console.error('Error al eliminar estudiante: ', error);
    });
};

// Función para manejar el envío del formulario
const handleFormSubmit = (e) => {
  e.preventDefault();
  const placa = form['placa'].value;
  const rif = form['rif'].value;
  const gps = form['gps'].value;
  const camara = form['camara'].value;
  const detalles = form['detalles'].value;

  // Obtener la fecha actual
  const currentDate = new Date();
  const fecha = currentDate.toLocaleDateString();

  // Crear un nuevo objeto con los datos del formulario, incluyendo la fecha actual
  const estudiante = {
    placa,
    rif,
    gps,
    camara,
    fecha,
    detalles,
  };

  // Verificar si se está editando un estudiante existente
  if (editKey) {
    // Actualizar el registro existente en Firebase
    update(ref(getDatabase(), `/${editKey}`), estudiante)
      .then(() => {
        console.log('Estudiante actualizado correctamente');
        // Restablecer editKey
        editKey = null;
        // Cerrar el modal
        modal.classList.remove('is-active');
        // Obtener el snapshot actualizado de los estudiantes y renderizar la tabla
        getStudentsSnapshot()
          .then((students) => {
            renderStudents(students);
          })
          .catch((error) => {
            console.error('Error al obtener estudiantes: ', error);
          });
      })
      .catch((error) => {
        console.error('Error al actualizar estudiante: ', error);
      });
  } else {
    // Verificar si la placa ya está registrada
    const databaseRef = ref(getDatabase(), '/');
    get(databaseRef)
      .then((snapshot) => {
        const data = snapshot.val();
        const placasExistentes = data ? Object.values(data).map(item => item.placa) : [];
        
        if (placasExistentes.includes(placa)) {
          alert('Esta placa ya está registrada.');
        } else {
          // Agregar un nuevo registro a Firebase
          push(databaseRef, estudiante)
            .then(() => {
              console.log('Estudiante añadido correctamente');
              // Cerrar el modal
              modal.classList.remove('is-active');
              // Obtener el snapshot actualizado de los estudiantes y renderizar la tabla
              getStudentsSnapshot()
                .then((students) => {
                  renderStudents(students);
                })
                .catch((error) => {
                  console.error('Error al obtener estudiantes: ', error);
                });
            })
            .catch((error) => {
              console.error('Error al añadir estudiante: ', error);
            });
        }
      })
      .catch((error) => {
        console.error('Error al verificar la placa: ', error);
      });
  }
};

// Obtener una referencia a la base de datos
const databaseRef = ref(getDatabase());

// Función para renderizar los estudiantes en la tabla
const itemsPerPage = 10; // Cantidad de registros por página
let currentPage = 1; // Página actual

const renderStudents = (students) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';

  // Reiniciar los contadores
  countWithRif = 0;
  countWithGPS = 0;
  countWithCamera = 0;

  // Obtener los registros para la página actual
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const studentsToRender = Object.entries(students).slice(startIndex, endIndex);

  studentsToRender.forEach(([key, student]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${student.placa}</td>
      <td>${student.rif}</td>
      <td>${student.gps}</td>
      <td>${student.camara}</td>
      <td>${student.fecha}</td>
      <td>
        <button class="button is-warning is-dark is-small" data-key="${key}">E</button>
        <button class="button is-danger is-dark is-small" data-key="${key}">X</button>
      </td>
    `;
    tbody.appendChild(tr);

    // Contar placas con Rif, GPS y cámara
    if (student.rif === 'si') countWithRif++;
    if (student.gps === 'si') countWithGPS++;
    if (student.camara === 'si') countWithCamera++;
  });

  // Mostrar los contadores
  document.getElementById('rif-counter').innerText = `Con Rif: ${countWithRif}`;
  document.getElementById('gps-counter').innerText = `Con GPS: ${countWithGPS}`;
  document.getElementById('camera-counter').innerText = `Con Cámara: ${countWithCamera}`;

  // Renderizar los controles de paginación
  renderPagination(students);
};

// Función para filtrar estudiantes por nombre
const filterStudentsByPlaca = (students, searchText) => {
  const filteredStudents = {};
  Object.entries(students).forEach(([key, student]) => {
    if (student.placa.toLowerCase().includes(searchText.toLowerCase())) {
      filteredStudents[key] = student;
    }
  });
  return filteredStudents;
};

// Función para obtener el snapshot de los estudiantes
let studentsSnapshot;
const getStudentsSnapshot = () => {
  return new Promise((resolve, reject) => {
    onValue(databaseRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        studentsSnapshot = data;
        resolve(studentsSnapshot);
      } else {
        // La base de datos está vacía o no se ha inicializado correctamente
        resolve({});
      }
    }, (error) => {
      reject(error);
    });
  });
};

// Obtener referencias a los elementos del DOM
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

// Event listener para el botón de búsqueda
searchButton.addEventListener('click', () => {
  const searchText = searchInput.value.trim();
  getStudentsSnapshot().then((students) => {
    const filteredStudents = filterStudentsByPlaca(students, searchText);
    renderStudents(filteredStudents);
  }).catch((error) => {
    console.error('Error al obtener estudiantes: ', error);
  });
});

// Event listener para los botones de editar y eliminar
document.querySelector('tbody').addEventListener('click', (e) => {
  if (e.target.classList.contains('is-warning')) {
    const key = e.target.dataset.key;
    handleEditStudent(key);
  } else if (e.target.classList.contains('is-danger')) {
    const key = e.target.dataset.key;
    handleDeleteStudent(key);
  }
});

// Escuchar cambios en la base de datos
getStudentsSnapshot().then((students) => {
  renderStudents(students);
}).catch((error) => {
  console.error('Error al obtener estudiantes: ', error);
});

// Esperar a que se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
  form.addEventListener('submit', handleFormSubmit);
});

