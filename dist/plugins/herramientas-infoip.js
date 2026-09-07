import fetch from "node-fetch";
function escapeHtml(text = "") {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
export default {
    name: ["ipinfo", "infoip", "ip"],
    tags: ["tools"],
    help: ["ipinfo <ip>"],
    desc: "Consulta información de una IP",
    register: true,
    owner: true,
    run: async ({ conn, m, text, prefijo }) => {
        if (!text)
            return m.reply(`❌ Ingresa una IP\n\nEjemplo:\n${prefijo}ipinfo 103.89.12.127`);
        const ip = text.trim();
        await m.react?.("🔍");
        try {
            const url = `https://api.mitzuki.xyz/tools/infoip?ip=${encodeURIComponent(ip)}&apikey=${process.env.API_KEY}`;
            const res = await fetch(url);
            const raw = await res.text();
            let json;
            try {
                json = JSON.parse(raw);
            }
            catch {
                throw new Error("La API no devolvió JSON válido");
            }
            if (!json?.status) {
                await m.react?.("❌");
                return m.reply(`❌ Error: ${escapeHtml(json?.error || "No encontrado")}`);
            }
            const d = json.data || {};
            const u = d.ubicacion || {};
            const p = d.proveedor || {};
            const s = d.seguridad || {};
            const c = u.coordenadas || {};
            const txt = `*\`🌐 INFORMACIÓN DE IP\`*
━━━━━━━━━━━━━━━━━━━━

🧷 IP:
${escapeHtml(d.ip || "N/A")}

📍 UBICACIÓN

- País: ${escapeHtml(u.pais || "N/A")} (${escapeHtml(u.codigo_pais || "--")})
- Continente: ${escapeHtml(u.continente || "N/A")}
- Ciudad: ${escapeHtml(u.ciudad || "N/A")}
- Región: ${escapeHtml(u.region || "N/A")}
- Código Postal: ${escapeHtml(u.codigo_postal || "N/A")}
- Coordenadas: ${escapeHtml(c.latitud ?? "?")}, ${escapeHtml(c.longitud ?? "?")}
- Zona Horaria: ${escapeHtml(u.zona_horaria || "N/A")}
- Moneda: ${escapeHtml(u.moneda || "N/A")}

🏢 PROVEEDOR

- ISP: ${escapeHtml(p.isp || "N/A")}
- Organización: ${escapeHtml(p.organizacion || "N/A")}
- ASN: ${escapeHtml(p.as || "N/A")}
`.trim();
            const lat = d.ubicacion?.coordenadas?.latitud;
            const lon = d.ubicacion?.coordenadas?.longitud;
            if (lat && lon) {
                const mapUrl = `https://static-maps.yandex.ru/1.x/?lang=es_ES&ll=${lon},${lat}&z=11&size=650,450&l=map&pt=${lon},${lat},pm2rdm`;
                await conn.sendMessage(m.chat, { image: { url: mapUrl }, caption: txt }, { quoted: m });
            }
            else {
                await m.reply(txt);
            }
            await m.react?.("✅");
        }
        catch (e) {
            console.error("[IPINFO ERROR]", e);
            await m.react?.("❌");
            return m.reply("❌ <b>Error consultando la IP</b>");
        }
    }
};
