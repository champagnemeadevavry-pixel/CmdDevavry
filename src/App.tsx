import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  price: number; // TTC
  image: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

const DEMO_PRODUCTS: Product[] = [
  { id: "p1",  name: "Brut Premier Cru",            price: 26.0,  image: "/Picture/Brut.png" },
  { id: "p2",  name: "Blanc de Blancs",             price: 28.0,  image: "/Picture/BB.png" },
  { id: "p3",  name: "Blanc de Noirs",              price: 30.0,  image: "/Picture/BNGC.png" },
  { id: "p4",  name: "Rosé Brut",                   price: 30.0,  image: "/Picture/Rose.png" },
  { id: "p5",  name: "Millésime 2016",              price: 30.0,  image: "/Picture/2016.png" },
  { id: "p6",  name: "BBGC 2019",                   price: 35.0,  image: "/Picture/BBGC.png" },
  { id: "p7",  name: "Monogram - Millésime 2018",   price: 50.0,  image: "/Picture/Monogram-2019.png" },
  { id: "p8",  name: "Millésime 1998",              price: 100.0, image: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400" },
  { id: "p9",  name: "Millésime 1989",              price: 130.0, image: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400" },
  { id: "p10", name: "Millésime 1982",              price: 180.0, image: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400" },
  { id: "p11", name: "Visite",                      price: 25.0,  image: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400" },
];

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export default function App() {
  const [products] = useState<Product[]>(DEMO_PRODUCTS);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qtyById, setQtyById] = useState<Record<string, number>>({});

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      setCart(JSON.parse(saved));
    }
  }, []);

  // Sauvegarder à chaque changement
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Total €
  const total = useMemo(() => {
    return Object.values(cart).reduce(
      (sum: number, it: CartItem) => sum + it.product.price * it.qty,
      0
    );
  }, [cart]);

  // Total articles
  const totalQty = useMemo(() => {
    return Object.values(cart).reduce(
      (s: number, it: CartItem) => s + it.qty,
      0
    );
  }, [cart]);

  function addToCart(product: Product, addQty: number) {
    if (!addQty || addQty <= 0) return;
    setCart((prev) => {
      const existing = prev[product.id];
      const nextQty = (existing?.qty ?? 0) + addQty;
      return { ...prev, [product.id]: { product, qty: nextQty } };
    });
  }

  function setItemQty(productId: string, newQty: number) {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: { ...existing, qty: newQty } };
    });
  }

  function clearCart() {
    setCart({});
  }

  // Export Excel local (téléchargement)
  function exportCartToExcel(cart: Record<string, CartItem>) {
    const items: CartItem[] = Object.values(cart);
    if (items.length === 0) return;

    const rows = items.map((it: CartItem, i: number) => ({
      "#": i + 1,
      Produit: it.product.name,
      Quantité: it.qty,
      "Prix unitaire TTC (€)": Number(it.product.price.toFixed(2)),
      "Sous-total TTC (€)": Number((it.product.price * it.qty).toFixed(2)),
    }));

    const total = items.reduce((s: number, it: CartItem) => s + it.product.price * it.qty, 0);
    rows.push({
      "#": "" as any,
      Produit: "TOTAL",
      Quantité: "" as any,
      "Prix unitaire TTC (€)": "" as any,
      "Sous-total TTC (€)": Number(total.toFixed(2)),
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    (ws as any)["!cols"] = [
      { wch: 4 },
      { wch: 28 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Commande");

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `commande_${date}.xlsx`);
  }

  // Envoi Excel par email via fonction Netlify
  async function sendExcelByEmail(cart: Record<string, CartItem>) {
    const items: CartItem[] = Object.values(cart);
    if (items.length === 0) return alert("Panier vide.");

    // --- Construire le workbook
    const rows = items.map((it: CartItem, i: number) => ({
      "#": i + 1,
      Produit: it.product.name,
      Quantité: it.qty,
      "Prix unitaire TTC (€)": Number(it.product.price.toFixed(2)),
      "Sous-total TTC (€)": Number((it.product.price * it.qty).toFixed(2)),
    }));
    const total = items.reduce((s: number, it: CartItem) => s + it.product.price * it.qty, 0);
    rows.push({
      "#": "" as any,
      Produit: "TOTAL",
      Quantité: "" as any,
      "Prix unitaire TTC (€)": "" as any,
      "Sous-total TTC (€)": Number(total.toFixed(2)),
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Commande");

    const date = new Date().toISOString().slice(0, 10);
    const filename = `commande_${date}.xlsx`;
    const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });

    // --- Appeler la fonction Netlify
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "champagnemeadevavry@gmail.com",
        subject: `Nouvelle commande - ${date}`,
        filename,
        contentBase64: base64,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert("Échec de l’envoi de l’email.\n" + msg);
      return;
    }
    alert("Email envoyé avec la commande en pièce jointe ✅");
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 20 }}>
      <h1>Prise de commandes</h1>

      {/* Liste Produits */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 16,
        }}
      >
        {products.map((p) => {
          const isExpanded = expandedId === p.id;
          const localQty = qtyById[p.id] ?? 1;

          return (
            <div
              key={p.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 8,
                background: "#fff",
              }}
            >
              <img
                src={p.image}
                alt={p.name}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: 250,
                  objectFit: "contain",
                }}
              />
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div>{currency.format(p.price)}</div>

              {!isExpanded ? (
                <button
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setExpandedId(p.id);
                    setQtyById((prev) => ({ ...prev, [p.id]: 1 }));
                  }}
                >
                  Ajouter
                </button>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() =>
                        setQtyById((prev) => ({
                          ...prev,
                          [p.id]: Math.max(1, (prev[p.id] ?? 1) - 1),
                        }))
                      }
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={localQty}
                      min={1}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setQtyById((prev) => ({
                          ...prev,
                          [p.id]: Number.isFinite(v) && v >= 1 ? v : 1,
                        }));
                      }}
                      style={{ width: 64, textAlign: "center" }}
                    />
                    <button
                      onClick={() =>
                        setQtyById((prev) => ({
                          ...prev,
                          [p.id]: (prev[p.id] ?? 1) + 1,
                        }))
                      }
                    >
                      +
                    </button>
                    <div style={{ marginLeft: "auto" }}>
                      Sous-total : {currency.format(p.price * localQty)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      style={{ flex: 1 }}
                      onClick={() => {
                        addToCart(p, localQty);
                        setExpandedId(null);
                      }}
                    >
                      Confirmer
                    </button>
                    <button
                      style={{ flex: 1 }}
                      onClick={() => setExpandedId(null)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Panier */}
      <h2 style={{ marginTop: 30 }}>Panier</h2>
      {Object.values(cart).length === 0 && <p>Aucun article.</p>}
      {Object.values(cart).map((it: CartItem) => (
        <div key={it.product.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>
            {it.qty} × {it.product.name}
          </span>
          <span style={{ marginLeft: "auto" }}>
            {currency.format(it.product.price * it.qty)}
          </span>
          <button onClick={() => setItemQty(it.product.id, it.qty - 1)}>−</button>
          <button onClick={() => setItemQty(it.product.id, it.qty + 1)}>+</button>
        </div>
      ))}

      {Object.values(cart).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <strong>Total : {totalQty} article(s) — {currency.format(total)}</strong>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={clearCart}>Vider</button>
            <button onClick={() => exportCartToExcel(cart)}>Exporter Excel</button>
            <button onClick={() => sendExcelByEmail(cart)}>Envoyer par email</button>
          </div>
        </div>
      )}
    </div>
  );
}
