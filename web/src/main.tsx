import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import { Layout } from "./Layout";
import { Home } from "./pages/Home";
import { Generate } from "./pages/Generate";
import { Archive } from "./pages/Archive";
import { MemberDetail } from "./pages/MemberDetail";
import { Members } from "./pages/Members";
import { Channels } from "./pages/Channels";
import { Settings } from "./pages/Settings";
import { Watch } from "./pages/Watch";
import { Login } from "./pages/Login";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/archive/:id" element={<Watch />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
