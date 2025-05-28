// Detectar si estamos en localhost, IP local o ngrok
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.");
const socketUrl = isLocal
  ? `http://${window.location.hostname}:3000`
  : "https://mule-charmed-cub.ngrok-free.app";

const socket = io(socketUrl, {
  reconnection: true,
  reconnectionDelay: 1000,
  transports: ["websocket"],
  upgrade: false,
  secure: !isLocal,
});

const videoContainer = document.getElementById("videoContainer");
const monitorContainer = document.getElementById("monitorContainer");
const verticalContainer = document.getElementById("verticalContainer");
const adminButton = document.getElementById("adminButton");
const passwordModal = document.getElementById("passwordModal");
const passwordInput = document.getElementById("passwordInput");
let isAdmin = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const resetButton = document.getElementById("resetButton");

// Manejadores de conexión
socket.on("connect", () => {
  console.log("Conectado al servidor:", socket.id);
  reconnectAttempts = 0;
});

socket.on("connect_error", (err) => {
  console.error("Error de conexión:", err.message);
  if (reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => socket.connect(), 5000);
    reconnectAttempts++;
  }
});

// Mostrar modal al hacer clic en el botón de administrador
adminButton.addEventListener("click", () => {
  passwordModal.style.display = "flex";
  setTimeout(() => passwordInput.focus(), 100);
});

// Función para verificar la contraseña
function checkPassword() {
  const password = passwordInput.value;
  socket.emit("checkAdminPassword", password);
}

// Permitir enviar con Enter
passwordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    checkPassword();
  }
});

// Cerrar modal al hacer clic fuera
passwordModal.addEventListener("click", (e) => {
  if (e.target === passwordModal) {
    passwordModal.style.display = "none";
  }
});

// Escuchar respuesta del servidor sobre la contraseña
socket.on("adminStatus", (data) => {
  isAdmin = data.isAdmin;
  if (isAdmin) {
    passwordModal.style.display = "none";
    adminButton.style.display = "none";
    initAdminView();
  } else {
    alert("Contraseña incorrecta");
  }
  toggleControls();
});

function initAdminView() {
  videoContainer.innerHTML = "";
  monitorContainer.innerHTML = "";
  verticalContainer.innerHTML = "";

  // Carga TODOS los videos con controles de admin
  initTVVideos(true); // <- El parámetro 'true' indica que es vista de admin

  // Resto del código existente (contenedores, botones, etc.)
  const monitorVerticalWrapper = document.createElement("div");
  monitorVerticalWrapper.style.display = "flex";
  monitorVerticalWrapper.style.justifyContent = "center";
  monitorVerticalWrapper.style.alignItems = "center";
  monitorVerticalWrapper.style.width = "100%";
  monitorVerticalWrapper.appendChild(monitorContainer);
  monitorVerticalWrapper.appendChild(verticalContainer);
  document.querySelector(".tv-caja").appendChild(monitorVerticalWrapper);

  const controlsWrapper = document.createElement("div");
  controlsWrapper.style.display = "flex";
  controlsWrapper.style.justifyContent = "center";
  controlsWrapper.style.marginTop = "20px";
  document.querySelector(".tv-caja").appendChild(controlsWrapper);

  resetButton.style.display = "block"
}

// Función global para cargar videos
document.getElementById('resetButton').addEventListener('click', () => {
  socket.emit('resetVideos');
});

window.loadVideo = function (index) {
  const videoType = index === 5 ? "monitor" : index === 6 ? "vertical" : "tv";
  const fileName =
    videoType === "monitor"
      ? "monitor.webm"
      : videoType === "vertical"
      ? "vertical.webm"
      : `${index}.webm`;

  const videoWrapper = createVideoWrapper({
    id: `tvVideo_${index}`,
    src: `/videos/${fileName}?${Date.now()}`,
    type: videoType,
    index: index,
    isAdmin: false,
  });

  videoContainer.innerHTML = "";
  monitorContainer.innerHTML = "";
  verticalContainer.innerHTML = "";

  if (index === 5) {
    monitorContainer.appendChild(videoWrapper);
    monitorContainer.style.display = "flex";
    videoContainer.style.display = "none";
    verticalContainer.style.display = "none";
  } else if (index === 6) {
    verticalContainer.appendChild(videoWrapper);
    verticalContainer.style.display = "flex";
    videoContainer.style.display = "none";
    monitorContainer.style.display = "none";
  } else {
    videoContainer.appendChild(videoWrapper);
    videoContainer.style.display = "flex";
    monitorContainer.style.display = "none";
    verticalContainer.style.display = "none";
  }

  const videoElement = document.getElementById(`tvVideo_${index}`);
  if (videoElement) {
    videoElement
      .play()
      .then(() => {
        videoElement
          .requestFullscreen()
          .catch((e) => console.log("Error en fullscreen:", e));
      })
      .catch((e) => console.log("Error al reproducir:", e));
  }
};

function initClientView() {
  videoContainer.innerHTML = `
                <button class="button" onclick="loadVideo(1)">Video 1</button>
                <button class="button" onclick="loadVideo(2)">Video 2</button>
                <button class="button" onclick="loadVideo(3)">Video 3</button>
                <button class="button" onclick="loadVideo(4)">Video 4</button>
                <button class="button" onclick="loadVideo(5)">Monitores</button>
                <button class="button" onclick="loadVideo(6)">Vertical</button>
            `;
  videoContainer.style.display = "flex";
  setupEventListeners(false);
  toggleControls();
}

function toggleControls() {}

function initTVVideos(isAdmin) {
  videoContainer.innerHTML = "";
  for (let i = 1; i <= 4; i++) {
    const videoWrapper = createVideoWrapper({
      id: `tvVideo_${i}`,
      src: `/videos/${i}.webm?${Date.now()}`,
      type: "tv",
      index: i,
      isAdmin,
    });
    videoContainer.appendChild(videoWrapper);
  }

  const monitorWrapper = createVideoWrapper({
    id: "tvVideo_5",
    src: `/videos/monitor.webm?${Date.now()}`,
    type: "monitor",
    index: 5,
    isAdmin,
  });
  monitorContainer.appendChild(monitorWrapper);

  const verticalWrapper = createVideoWrapper({
    id: "tvVideo_6",
    src: `/videos/vertical.webm?${Date.now()}`,
    type: "vertical",
    index: 6,
    isAdmin,
  });
  verticalContainer.appendChild(verticalWrapper);
}

function createVideoWrapper({ id, src, type, index, isAdmin }) {
  const wrapper = document.createElement("div");
  wrapper.className = "video-wrapper";

  const video = document.createElement("video");
  video.id = id;
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.controls = false;
  video.className = "tv-video";
  video.innerHTML = `<source src="${src}" type="video/webm">`;

  if (isAdmin) {
    const replaceButton = document.createElement("button");
    replaceButton.className = "button";
    replaceButton.textContent =
      type === "monitor"
        ? "Reemplazar Monitores"
        : type === "vertical"
        ? "Reemplazar Vertical"
        : `Reemplazar Video ${index}`;
    replaceButton.onclick = () => handleFileUpload(type, index);
    wrapper.append(video, replaceButton);
  } else {
    const fullscreenButton = document.createElement("button");
    fullscreenButton.className = "fullscreen-button";
    fullscreenButton.textContent = "Pantalla completa";
    fullscreenButton.onclick = () => video.requestFullscreen();
    wrapper.append(video, fullscreenButton);
  }
  return wrapper;
}

function handleFileUpload(type, index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".webm";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    const newName = `${
      type === "monitor"
        ? "monitor"
        : type === "vertical"
        ? "vertical"
        : `${index}`
    }_${Date.now()}.webm`;
    formData.append("video", file, newName);
    formData.append("index", index.toString());

    fetch(`/uploadVideo/${type}`, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          socket.emit("videoUpdated", { type, index, fileName: newName });
        }
      });
  };
  input.click();
}

function setupEventListeners(isAdmin) {
  socket.on("resetVideos", () => {
    videoContainer.querySelectorAll("video").forEach((v) => {
      v.currentTime = 0;
      v.play();
    });
    monitorContainer.querySelectorAll("video").forEach((v) => {
      v.currentTime = 0;
      v.play();
    });
    verticalContainer.querySelectorAll("video").forEach((v) => {
      v.currentTime = 0;
      v.play();
    });
  });
}

// Monitoreo de conexión
setInterval(() => {
  socket.emit("ping", Date.now());
}, 30000);

socket.on("pong", (timestamp) => {
  console.log("Latencia:", Date.now() - timestamp + "ms");
});

// Inicializar vista de cliente por defecto
initClientView();