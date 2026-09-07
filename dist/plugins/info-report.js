import { db } from "../lib/db.js";
export default {
    name: ["report", "reporte", "bug", "bugs", "suggestion", "sugge", "request"],
    help: ["report <error>", "suggestion <sugerencia>"],
    desc: "Enviar reportes o sugerencias al staff",
    tags: ["main"],
    register: true,
    run: async ({ m, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`⚠️ Escribe ${/sugge|suggestion/i.test(cmd)
                ? "tu sugerencia"
                : "el error o comando con falla"}\n\n📌 Ejemplo:\n${prefijo + cmd} ${/sugge|suggestion/i.test(cmd)
                ? "Agreguen comando Spotify"
                : "Los stickers no funcionan"}`);
        if (text.length < 10)
            return m.reply("✨ Mínimo *10 caracteres* para enviar el reporte.");
        if (text.length > 1000)
            return m.reply("⚠️ Máximo *1000 caracteres*.");
        const nombre = m.pushName || "Sin nombre";
        const tipo = /sugge|suggestion/i.test(cmd) ? "sugerencia" : "reporte";
        await db.query(`INSERT INTO reportes (sender_id, sender_name, mensaje, tipo)
       VALUES ($1, $2, $3, $4)`, [m.sender, nombre, text, tipo]);
        return m.reply(tipo === "sugerencia"
            ? "✅ Gracias, tu sugerencia fue enviada al staff."
            : "✅ Reporte enviado, será revisado.");
    }
};
