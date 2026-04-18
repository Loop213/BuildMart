const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function request(path, options = {}) {
  const token = localStorage.getItem("buildmart_token");

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 403 && /account rejected/i.test(data.message || "")) {
      window.dispatchEvent(
        new CustomEvent("buildmart:auth-blocked", {
          detail: { message: data.message || "Account rejected. Contact admin." }
        })
      );
    }
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export function fetcher(path) {
  return request(path);
}

export { API_URL };
