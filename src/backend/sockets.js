//import .env : .config() sets .env varibles to process.env
import dotenv from "dotenv";
dotenv.config();

// create a Server clas instance {} tells js to only use the Server
// blue print only from the socket.io lib
import { Server } from "socket.io";
//const io = new Server(server);            //attach the sockets to the server instance(engine)

//in memory map of users
const userMap = new Map();

const setupSocket = (server) => {
  const io = new Server(server, {
    cors:{
      origin: "http://localhost:3000", // only allow request from this domain
      methods: ["GET", "POST"],
      credentials: true //Allow cookies and authentication headers in cross-origin requests
    },
  });

  io.on("connection", (socket) => {
    //get user id from handshake
    const userId = socket.handshake.query.userId;
    if (userId) {
      userMap.set(userId, socket.id);
      console.log(`User ${userId} connected at socket ${socket.id}`);
    }

    //handle the direct messages
    socket.on("sendMessage", (payload) => {
      const { sender, recipient, content, messageType } = payload;

      // In a real app, you would save to the DB here
      const messageData = {
        _id: sender.toString(),
        sender,
        recipient,
        content,
        messageType: messageType || "text",
        timestamp: new Date().toISOString(),
      };

      // Emit to both sender and recipient 
      const recipientSocketId = userSocketMap.get(recipient);
      const senderSocketId = userSocketMap.get(sender);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        userMap.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });
  return io;
}

export {setupSocket};
