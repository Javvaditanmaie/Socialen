import React, { useEffect, useState } from "react";
import socket from "../services/socket";

export default function NotificationsToast() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      // if you want to join a user room:
      // socket.emit('joinRoom', userId);
    });

    socket.on("notification", (data) => {
      console.log(" New notification:", data);
      setNotifications((prev) => [data, ...prev].slice(0, 10)); // keep last 10
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.off("notification");
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ position: "fixed", right: 16, top: 16, zIndex: 9999 }}>
      {notifications.map((n, i) => (
        <div key={i} style={{
          background: "#fff",
          border: "1px solid #ddd",
          padding: 12,
          marginBottom: 8,
          borderRadius: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}>
          <div style={{fontWeight: 600}}>{n.message || "Notification"}</div>
          {n.email && <div style={{fontSize: 12, color: "#666"}}>{n.email}</div>}
          <div style={{fontSize: 11, color: "#999", marginTop: 4}}>{new Date().toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  );
}
