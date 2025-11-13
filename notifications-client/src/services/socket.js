import { io } from "socket.io-client";

const SOCKET_URL =  import.meta.env.VITE_NOTIF_URL || "http://localhost:6001";

const socket = io(SOCKET_URL, {
  autoConnect: false,   
  transports: ["websocket"],
  reconnectionAttempts: 5,
});


export default socket;
