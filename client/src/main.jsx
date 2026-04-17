import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import { Toaster } from "react-hot-toast";
import { App } from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { fetcher } from "./api/http";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <SWRConfig
              value={{
                fetcher,
                revalidateOnFocus: false,
                keepPreviousData: true
              }}
            >
              <App />
              <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
            </SWRConfig>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

