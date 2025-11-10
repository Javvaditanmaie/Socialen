// Notifications/socketClient.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log(" Connected to WebSocket server");
});

socket.on("invitationAccepted", (data) => {
  console.log(" Notification:", data.message);
});

socket.on("linkExpired", (data) => {
  console.log("Notification:", data.message);
});

socket.on("disconnect", () => {
  console.log(" Disconnected from server");
});
