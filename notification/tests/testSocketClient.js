import { io } from "socket.io-client";

const socket = io("http://localhost:6001");

socket.on("connect", () => {
  console.log("Connected to WebSocket:", socket.id);
});

socket.on("notification", (data) => {
  console.log(" Received notification:", data);
});

socket.on("disconnect", () => {
  console.log(" Disconnected from WebSocket");
});
