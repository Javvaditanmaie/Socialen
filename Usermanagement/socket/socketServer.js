import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // or specific frontend URL
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Example: Listen to a "joinRoom" event
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`User joined room ${roomId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
