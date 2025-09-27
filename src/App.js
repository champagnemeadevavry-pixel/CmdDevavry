import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
// ✅ Tous tes produits
const DEMO_PRODUCTS = [
    { id: "p1", name: "Brut Premier Cru", price: 26.0, image: "/Picture/Brut.png" },
    { id: "p2", name: "Blanc de Blancs", price: 28.0, image: "/Picture/BB.png" },
    { id: "p3", name: "Blanc de Noirs", price: 30.0, image: "/Picture/BNGC.png" },
    { id: "p4", name: "Rosé Brut", price: 30.0, image: "/Picture/Rose.png" },
    { id: "p5", name: "Millésime 2016", price: 30.0, image: "/Picture/2016.png" },
    { id: "p6", name: "BBGC 2019", price: 35.0, image: "/Picture/BBGC.png" },
    { id: "p7", name: "Monogram - Millésime 2018", price: 50.0, image: "/Picture/Monogram-2019.png" },
    { id: "p8", name: "Millésime 1998", price: 100.0, image: "/Picture/1998.png" },
    { id: "p9", name: "Millésime 1989", price: 130.0, image: "/Picture/1989.png" },
    { id: "p10", name: "Millésime 1982", price: 180.0, image: "/Picture/1982.png" },
    { id: "p11", name: "Visite", price: 25.0, image: "/Picture/Visites.png" },
];
const currency = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});
export default function App() {
    const [products] = useState(DEMO_PRODUCTS);
    const [cart, setCart] = useState({});
    const [sending, setSending] = useState(false);
    // Charger depuis localStorage
    useEffect(() => {
        const saved = localStorage.getItem("cart");
        if (saved)
            setCart(JSON.parse(saved));
    }, []);
    // Sauvegarder à chaque changement
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart));
    }, [cart]);
    const total = useMemo(() => Object.values(cart).reduce((s, it) => s + it.product.price * it.qty, 0), [cart]);
    const totalQty = useMemo(() => Object.values(cart).reduce((s, it) => s + it.qty, 0), [cart]);
    function addToCart(product, qty) {
        setCart((prev) => {
            const existing = prev[product.id];
            const newQty = (existing?.qty || 0) + qty;
            return { ...prev, [product.id]: { product, qty: newQty } };
        });
    }
    function clearCart() {
        setCart({});
    }
    // ---------- Génération Excel (base64) ----------
    function cartToExcelBase64(cart) {
        const items = Object.values(cart);
        if (!items.length)
            return null;
        const rows = items.map((it, i) => ({
            "#": i + 1,
            Produit: it.product.name,
            Quantité: it.qty,
            "Prix unitaire TTC (€)": Number(it.product.price.toFixed(2)),
            "Sous-total TTC (€)": Number((it.product.price * it.qty).toFixed(2)),
        }));
        const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
        rows.push({
            "#": "",
            Produit: "TOTAL",
            Quantité: "",
            "Prix unitaire TTC (€)": "",
            "Sous-total TTC (€)": Number(total.toFixed(2)),
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        // largeur colonnes (optionnel)
        ws["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, "Commande");
        const date = new Date().toISOString().slice(0, 10);
        const filename = `commande_${date}.xlsx`;
        const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
        return { base64, filename };
    }
    // ---------- Export local (téléchargement) ----------
    function exportCartToExcel() {
        const payload = cartToExcelBase64(cart);
        if (!payload)
            return;
        // On régénère le fichier pour téléchargement local
        const items = Object.values(cart);
        const rows = items.map((it, i) => ({
            "#": i + 1,
            Produit: it.product.name,
            Quantité: it.qty,
            "Prix unitaire TTC (€)": Number(it.product.price.toFixed(2)),
            "Sous-total TTC (€)": Number((it.product.price * it.qty).toFixed(2)),
        }));
        const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
        rows.push({
            "#": "",
            Produit: "TOTAL",
            Quantité: "",
            "Prix unitaire TTC (€)": "",
            "Sous-total TTC (€)": Number(total.toFixed(2)),
        });
        const wb2 = XLSX.utils.book_new();
        const ws2 = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb2, ws2, "Commande");
        XLSX.writeFile(wb2, payload.filename);
    }
    // ---------- Envoi Email via Netlify Function ----------
    async function sendExcelByEmail() {
        const payload = cartToExcelBase64(cart);
        if (!payload) {
            alert("Panier vide");
            return;
        }
        const { base64, filename } = payload;
        setSending(true);
        try {
            const res = await fetch("/.netlify/functions/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: "champagnemeadevavry@gmail.com",
                    subject: `Nouvelle commande (${totalQty} article(s)) – Total ${currency.format(total)}`,
                    filename,
                    contentBase64: base64,
                    message: `Commande du ${new Date().toLocaleDateString("fr-FR")}.\nTotal TTC: ${currency.format(total)}.\nNombre d'articles: ${totalQty}.`,
                }),
            });
            if (!res.ok) {
                const msg = await res.text();
                alert("❌ Erreur lors de l'envoi : " + msg);
                return;
            }
            alert("✅ Email envoyé avec la commande en pièce jointe !");
            // Option : vider le panier après envoi
            // clearCart();
        }
        finally {
            setSending(false);
        }
    }
    return (_jsxs("div", { style: { padding: 20, fontFamily: "system-ui" }, children: [_jsx("h1", { children: "Prise de commandes" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 16 }, children: products.map((p) => (_jsxs("div", { style: { border: "1px solid #ddd", padding: 8, borderRadius: 8, width: 180 }, children: [_jsx("img", { src: p.image, alt: p.name, style: { width: "100%", height: 120, objectFit: "contain" } }), _jsx("div", { style: { fontWeight: "bold" }, children: p.name }), _jsx("div", { children: currency.format(p.price) }), _jsx("button", { onClick: () => addToCart(p, 1), style: { marginTop: 8 }, children: "Ajouter" })] }, p.id))) }), _jsx("h2", { style: { marginTop: 20 }, children: "Panier" }), Object.values(cart).map((it) => (_jsxs("div", { children: [it.qty, " \u00D7 ", it.product.name, " \u2192 ", currency.format(it.product.price * it.qty)] }, it.product.id))), Object.values(cart).length > 0 && (_jsxs("div", { style: { marginTop: 20 }, children: [_jsxs("strong", { children: ["Total : ", currency.format(total), " (", totalQty, " article(s))"] }), _jsxs("div", { style: { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }, children: [_jsx("button", { onClick: clearCart, children: "Vider" }), _jsx("button", { onClick: exportCartToExcel, children: "Exporter Excel" }), _jsx("button", { onClick: sendExcelByEmail, disabled: sending, children: sending ? "Envoi en cours..." : "Valider & envoyer" })] })] }))] }));
}
