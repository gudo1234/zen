import crypto from "crypto";
import { db } from "../lib/db.js";
function genCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars
}
export default {
    name: ["verify"],
    /* help: ["verify <discord_id>"],
     desc: "Vincula tu cuenta de Discord",
     tags: ["main"],*/
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const whatsappId = m.sender;
        if (!args[0] || !/^\d{15,20}$/.test(args[0])) {
            return m.reply(`❌ Discord ID inválido.\n\n📌 Ejemplo:\n${prefijo + cmd} 1008834879858946170`);
        }
        const discordId = args[0];
        const code = genCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        try {
            // borrar códigos viejos
            await db.query(`DELETE FROM discord_verify_codes WHERE whatsapp_id = $1`, [whatsappId]);
            // guardar nuevo código
            await db.query(`INSERT INTO discord_verify_codes (discord_id, whatsapp_id, code, expires_at)
         VALUES ($1, $2, $3, $4)`, [discordId, whatsappId, code, expires]);
            /**
             * 👉 ACÁ SOLO AVISÁS
             * El bot de Discord escucha esto desde DB / Redis / API
             */
            await m.reply(`📨 *Verificación iniciada*\n\n` +
                `Se envió un código por DM a tu Discord.\n\n` +
                `⏳ Expira en 10 minutos.\n` +
                `✍️ Luego usa:\n` +
                `*.verifycode ${code.slice(0, 4)}****`);
        }
        catch (e) {
            console.error("VERIFY ERROR:", e);
            await m.reply("❌ Error iniciando la verificación. Intenta de nuevo.");
        }
    }
};
