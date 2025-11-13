import React from "react";
import NotificationsToast from "./components/NotificationsToast";

function App() {
  return (
    <div>
      <h1>Notifications Demo</h1>
      <NotificationsToast />
      <div style={{padding:20}}>
        <p>Open DevTools to see events.</p>
      </div>
    </div>
  );
}

export default App;
