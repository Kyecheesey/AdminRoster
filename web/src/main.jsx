import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(<App />);

// Register the service worker so the app can be installed to a home screen and
// still open without a signal. Dev runs unregistered — a cached shell there
// just gets in the way of hot reloads.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is a bonus; never break the app over it */
    });
  });
}
