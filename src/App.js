import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
/** ---------- Données démo (adapte les images si besoin) ---------- */
const DEMO_PRODUCTS = [
    { id: "p1", name: "Brut Premier Cru", price: 26, image: "/Picture/Brut.png" },
    { id: "p2", name: "Blanc de Blancs", price: 28, image: "/Picture/BB.png" },
    { id: "p3", name: "Blanc de Noirs", price: 30, image: "/Picture/BNGC.png" },
    { id: "p4", name: "Rosé Brut", price: 30, image: "/Picture/Rose.png" },
    { id: "p5", name: "Millésime 2016", price: 30, image: "/Picture/2016.png" },
    { id: "p6", name: "BBGC 2019", price: 35, image: "/Picture/BBGC.png" },
    { id: "p7", name: "Monogram - Millésime 2018", price: 50, image: "/Picture/Monogram-2019.png" },
    { id: "p8", name: "Millésime 1998", price: 100, image: "/Picture/1998.png" },
    { id: "p9", name: "Millésime 1989", price: 130, image: "/Picture/1989.png" },
    { id: "p10", name: "Millésime 1982", price: 180, image: "/Picture/1982.png" },
    { id: "p11", name: "Visite", price: 25, image: "/Picture/Visites.png" }
];
const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
/** ---------- Composant ---------- */
export default function App() {
    const [products] = useState(DEMO_PRODUCTS);
    const [cart, setCart] = useState({});
    const [expandedId, setExpandedId] = useState(null);
    const [qtyById, setQtyById] = useState({});
    // Charger / sauvegarder le panier (localStorage)
    useEffect(() => {
        const saved = localStorage.getItem("cart");
        if (saved)
            setCart(JSON.parse(saved));
    }, []);
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart));
    }, [cart]);
    const total = useMemo(() => Object.values(cart).reduce((s, it) => s + it.product.price * it.qty, 0), [cart]);
    const totalQty = useMemo(() => Object.values(cart).reduce((s, it) => s + it.qty, 0), [cart]);
    function addToCart(product, addQty) {
        if (!addQty || addQty <= 0)
            return;
        setCart(prev => {
            const existing = prev[product.id];
            const nextQty = (existing?.qty ?? 0) + addQty;
            return { ...prev, [product.id]: { product, qty: nextQty } };
        });
    }
    function setItemQty(productId, newQty) {
        setCart(prev => {
            const existing = prev[productId];
            if (!existing)
                return prev;
            if (newQty <= 0) {
                const { [productId]: _omit, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: { ...existing, qty: newQty } };
        });
    }
    function clearCart() {
        setCart({});
    }
    /** ---------- Export Excel (téléchargement local) ---------- */
    function exportCartToExcel(cart) {
        const items = Object.values(cart);
        if (items.length === 0)
            return;
        const rows = items.map((it, i) => ({
            "#": i + 1,
            Produit: it.product.name,
            Quantité: it.qty,
            "Prix unitaire TTC (€)": Number(it.product.price.toFixed(2)),
            "Sous-total TTC (€)": Number((it.product.price * it.qty).toFixed(2))
        }));
        const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
        rows.push({
            "#": "",
            Produit: "TOTAL",
            Quantité: "",
            "Prix unitaire TTC (€)": "",
            "Sous-total TTC (€)": Number(total.toFixed(2))
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, "Commande");
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `commande_${date}.xlsx`);
    }
    /** ---------- Envoi par Email via fonction Netlify (EmailJS) ---------- */
    async function sendExcelByEmail(cart) {
        const items = Object.values(cart);
        if (items.length === 0)
            return alert("Panier vide.");
        // Prépare le fichier Excel en Base64
        const rows = items.map((it, i) => ({
            "#": i + 1,
            Produit: it.product.name,
            Quantité: it.qty,
            "Prix unitaire TTC (€)": Number(it.product.price.toFixed(2)),
            "Sous-total TTC (€)": Number((it.product.price * it.qty).toFixed(2))
        }));
        const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
        rows.push({
            "#": "",
            Produit: "TOTAL",
            Quantité: "",
            "Prix unitaire TTC (€)": "",
            "Sous-total TTC (€)": Number(total.toFixed(2))
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Commande");
        const date = new Date().toISOString().slice(0, 10);
        const filename = `commande_${date}.xlsx`;
        const base64Excel = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
        // Appel à la fonction Netlify
        const res = await fetch("/.netlify/functions/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: "champagnemeadevavry@gmail.com", // facultatif si To est figé dans EmailJS
                subject: `Nouvelle commande - ${date}`,
                filename,
                contentBase64: base64Excel,
                message: "Détails de la commande en pièce jointe."
            })
        });
        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            alert("Échec de l’envoi de l’email.\n" + msg);
            return;
        }
        alert("Email envoyé avec la commande en pièce jointe ✅");
    }
    /** ---------- UI ---------- */
    return (_jsxs("div", { style: { fontFamily: "system-ui", padding: 20 }, children: [_jsx("h1", { children: "Prise de commandes" }), _jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: 16
                }, children: products.map((p) => {
                    const isExpanded = expandedId === p.id;
                    const localQty = qtyById[p.id] ?? 1;
                    return (_jsxs("div", { style: {
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: 8,
                            background: "#fff"
                        }, children: [_jsx("img", { src: p.image, alt: p.name, style: {
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: 250,
                                    objectFit: "contain"
                                } }), _jsx("div", { style: { fontWeight: 600 }, children: p.name }), _jsx("div", { children: currency.format(p.price) }), !isExpanded ? (_jsx("button", { style: { marginTop: 8 }, onClick: () => {
                                    setExpandedId(p.id);
                                    setQtyById((prev) => ({ ...prev, [p.id]: 1 }));
                                }, children: "Ajouter" })) : (_jsxs("div", { style: { marginTop: 8 }, children: [_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx("button", { onClick: () => setQtyById((prev) => ({
                                                    ...prev,
                                                    [p.id]: Math.max(1, (prev[p.id] ?? 1) - 1)
                                                })), children: "\u2212" }), _jsx("input", { type: "number", min: 1, value: localQty, onChange: (e) => {
                                                    const v = Number(e.target.value);
                                                    setQtyById((prev) => ({
                                                        ...prev,
                                                        [p.id]: Number.isFinite(v) && v >= 1 ? v : 1
                                                    }));
                                                }, style: { width: 64, textAlign: "center" } }), _jsx("button", { onClick: () => setQtyById((prev) => ({
                                                    ...prev,
                                                    [p.id]: (prev[p.id] ?? 1) + 1
                                                })), children: "+" }), _jsxs("div", { style: { marginLeft: "auto" }, children: ["Sous-total : ", currency.format(p.price * localQty)] })] }), _jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [_jsx("button", { style: { flex: 1 }, onClick: () => {
                                                    addToCart(p, localQty);
                                                    setExpandedId(null);
                                                }, children: "Confirmer" }), _jsx("button", { style: { flex: 1 }, onClick: () => setExpandedId(null), children: "Annuler" })] })] }))] }, p.id));
                }) }), _jsx("h2", { style: { marginTop: 30 }, children: "Panier" }), Object.values(cart).length === 0 && _jsx("p", { children: "Aucun article." }), Object.values(cart).map((it) => (_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsxs("span", { children: [it.qty, " \u00D7 ", it.product.name] }), _jsx("span", { style: { marginLeft: "auto" }, children: currency.format(it.product.price * it.qty) }), _jsx("button", { onClick: () => setItemQty(it.product.id, it.qty - 1), children: "\u2212" }), _jsx("button", { onClick: () => setItemQty(it.product.id, it.qty + 1), children: "+" })] }, it.product.id))), Object.values(cart).length > 0 && (_jsxs("div", { style: { marginTop: 20 }, children: [_jsxs("strong", { children: ["Total : ", totalQty, " article(s) \u2014 ", currency.format(total)] }), _jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: clearCart, children: "Vider" }), _jsx("button", { onClick: () => exportCartToExcel(cart), children: "Exporter Excel" }), _jsx("button", { onClick: () => sendExcelByEmail(cart), children: "Envoyer par email" })] })] }))] }));
}
