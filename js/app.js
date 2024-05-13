// Importar los módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

// Constantes con los id de los botones y modal
const openModal = document.getElementById('nuevo');
const modal = document.getElementById('modal');
const cancel = document.getElementById('cancel');
const form = document.getElementById('register-form');

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

  // Obtener datos del estudiante una vez
  get(studentRef)
    .then((snapshot) => {
      const student = snapshot.val();

      // Precargar los campos del formulario con los datos del estudiante
      form['placa'].value = student.placa;
      form['rif'].value = student.rif;
      form['gps'].value = student.gps;
      form['camara'].value = student.camara;
      form['fecha'].value = student.fecha;
      form['detalles'].value = student.detalles;

      // Asignar la clave del registro que se está editando
      editKey = key;

      // Mostrar el modal
      modal.classList.add('is-active');
    })
    .catch((error) => {
      console.error('Error al obtener datos del estudiante: ', error);
    });
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
    // Agregar un nuevo registro a Firebase
    push(ref(getDatabase(), '/'), estudiante)
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
};

// Obtener una referencia a la base de datos
const databaseRef = ref(getDatabase());

// Función para renderizar los estudiantes en la tabla
const renderStudents = (students) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';

  Object.entries(students).forEach(([key, student]) => {
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
  });
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

//Escuchar cambios en la base de datos
getStudentsSnapshot().then((students) => {
renderStudents(students);
}).catch((error) => {
console.error('Error al obtener estudiantes: ', error);
});
// Esperar a que se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
form.addEventListener('submit', handleFormSubmit);
});