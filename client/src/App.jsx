import { useDeferredValue, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { AuthPage } from "./pages/AuthPage";
import { CartPage } from "./pages/CartPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminPage } from "./pages/AdminPage";
import { SearchPage } from "./pages/SearchPage";

export function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  return (
    <div className="min-h-screen bg-app text-app transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_30%)]" />
      <Navbar
        search={search}
        setSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                search={deferredSearch}
                category={category}
                setCategory={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
                page={page}
                setPage={setPage}
              />
            }
          />
          <Route
            path="/products"
            element={
              <HomePage
                search={deferredSearch}
                category={category}
                setCategory={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
                page={page}
                setPage={setPage}
                showHero={false}
                eyebrow="Products"
                title="All Construction Products"
                description="Browse all sand, rod, and cement products with filters and pagination."
              />
            }
          />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <DashboardPage initialSection="orders" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardPage initialSection="profile" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
