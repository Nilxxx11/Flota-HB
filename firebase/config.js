// Configuración de Firebase - Reemplaza con tus datos
const firebaseConfig = {

  apiKey: "AIzaSyAmkn-v3m8VzM9OjRKQh95xWMsGSTO3Ccg",

  authDomain: "flotahb.firebaseapp.com",

  projectId: "flotahb",

  storageBucket: "flotahb.firebasestorage.app",

  messagingSenderId: "306091024956",

  appId: "1:306091024956:web:519a2df78a6d5fed58d939"

};


// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Referencia a la colección de vehículos
const vehiclesRef = database.ref('vehicles');