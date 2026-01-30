import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

// Lazy load components to enable code splitting
const App = React.lazy(() => import("./App"));
const MiniInfoApp = React.lazy(() => import("./MiniInfoApp"));

const initialView = window.vscodeInitialView || "editor";

function Root() {
  return (
    <HashRouter>
      <Suspense fallback={<div style={{ padding: "20px" }}>Loading...</div>}>
        <Routes>
          <Route
            path="/"
            element={
              initialView === "miniInfo" ? (
                <Navigate to="/mini-info" replace />
              ) : (
                <App />
              )
            }
          />
          <Route path="/editor" element={<App />} />
          <Route path="/mini-info" element={<MiniInfoApp />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
