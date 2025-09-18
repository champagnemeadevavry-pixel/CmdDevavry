import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

// ✅ Tous tes produits
const DEMO_PRODUCTS: Product[] = [
  { id: "p1",  name: "Brut Premier Cru",            price: 26.0,  image: "/Picture/Brut.png" },
  { id: "p2",  name: "Blanc de Blancs",             price: 28.0,  image: "/Picture/BB.png" },
  { id: "p3",  name: "Blanc de Noirs",              price: 30.0,  image: "/Picture/BNGC.png" },
  { id: "p4",  name: "Rosé Brut",                   price: 30.0,  image: "/Picture/Rose.png" },
  { id: "p5",  name: "Millésime 2016",              price: 30.0,  image: "/Picture/2016.png" },
  { id: "p6",  name: "BBGC 2019",                   price: 35.0,  image: "/Picture/BBGC.png" },
  { id: "p7",  name: "Monogram - Millésime 2018",   price: 50.0,  image: "/Picture/Monogram-2019.png" },
  { id: "p8",  name: "Millésime 1998",              price: 100.0, image: "/Picture/1998.png" },
  { id: "p9",  name: "Millésime 1989",              price: 130.0, image: "/Picture/1989.png" },
  { id: "p10", name: "Millésime 1982",              price: 180.0, image: "/Picture/1982.png" },
  { id: "p11", name: "Visite",                      price: 25.0,  image: "/Picture/Visites.png" },
];

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export default function App() {
  const [products] = useState<Product[]>(DEMO_PRODUCTS);
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  // Sauvegarder à chaque changement
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const total = useMemo(
    () => Object.values(cart).reduce((s, it) => s + it.product.price * it.qty, 0),
    [cart]
  );

  function addToCart(product: Product, qty: number) {
    setCart((prev) => {
      const existing = prev[product.id];
      const newQty = (existing?.qty || 0) + qty;
      return { ...prev, [product.id]: { product, qty: newQty } };
    });
  }

  function clearCart() {
    setCart({});
  }

  // ✅ Export local
  function exportCartToExcel() {
    const items = Object.values(cart);
    if (!items.length) return;

    const rows = items.map((it, i) => ({
      "#": i + 1,
      Produit: it.product.name,
      Quantité: it.qty,
      "Prix unitaire TTC (€)": it.product.price,
      "Sous-total TTC (€)": it.product.price * it.qty,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Commande");

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `commande_${date}.xlsx`);
  }

  // ✅ Envoi Email via Netlify Function
  async function sendExcelByEmail() {
    const items = Object.values(cart);
    if (!items.length) {
      alert("Panier vide");
      return;
    }

    // Générer Excel en base64
    const rows = items.map((it, i) => ({
      "#": i + 1,
      Produit: it.product.name,
      Quantité: it.qty,
      "Prix unitaire TTC (€)": it.product.price,
      "Sous-total TTC (€)": it.product.price * it.qty,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Commande");

    const base64Excel = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    const date = new Date().toISOString().slice(0, 10);

    // Appel vers Netlify
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "champagnemeadevavry@gmail.com",
        subject: `Nouvelle commande - ${new Date().toLocaleDateString("fr-FR")}`,
        filename: `commande_${date}.xlsx`,
        contentBase64: base64Excel,
        message: "Détails de la commande en pièce jointe.",
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      alert("❌ Erreur lors de l'envoi : " + msg);
      return;
    }
    alert("✅ Email envoyé avec succès !");
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Prise de commandes</h1>

      {/* Liste Produits */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {products.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", padding: 8, borderRadius: 8, width: 180 }}>
            <img src={p.image} alt={p.name} style={{ width: "100%", height: 120, objectFit: "contain" }} />
            <div style={{ fontWeight: "bold" }}>{p.name}</div>
            <div>{currency.format(p.price)}</div>
            <button onClick={() => addToCart(p, 1)} style={{ marginTop: 8 }}>
              Ajouter
            </button>
          </div>
        ))}
      </div>

      {/* Panier */}
      <h2 style={{ marginTop: 20 }}>Panier</h2>
      {Object.values(cart).map((it) => (
        <div key={it.product.id}>
          {it.qty} × {it.product.name} → {currency.format(it.product.price * it.qty)}
        </div>
      ))}

      {Object.values(cart).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <strong>Total : {currency.format(total)}</strong>
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={clearCart}>Vider</button>
            <button onClick={exportCartToExcel}>Exporter Excel</button>
            <button onClick={sendExcelByEmail}>Envoyer par email</button>
          </div>
        </div>
      )}
    </div>
  );
}
