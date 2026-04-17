import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const stored = localStorage.getItem("buildmart_cart");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("buildmart_cart", JSON.stringify(items));
  }, [items]);

  function addToCart(product) {
    setItems((current) => {
      const existing = current.find((item) => item.product === product._id);
      if (existing) {
        return current.map((item) =>
          item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success(`${product.name} added to cart`);
      return [
        ...current,
        {
          product: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          unit: product.unit,
          stock: product.stock,
          quantity: 1
        }
      ];
    });
  }

  function updateQuantity(productId, quantity) {
    setItems((current) =>
      current
        .map((item) => (item.product === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setItems((current) => current.filter((item) => item.product !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, quantity };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, totals, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

