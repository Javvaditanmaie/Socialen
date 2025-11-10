import http from "http";
import app from "./app.js";
import {initSocket} from "./socket/socketServer.js";
const server=http.createServer(app);
initSocket(server);
const PORT=process.env.PORT||5000;
server.listen(PORT,()=>console.log(`server running on port${PORT}`))