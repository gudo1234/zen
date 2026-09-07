import { db } from "../lib/db.js";
export default {
    name: ["verifycode"],
    register: true,
    run: async ({ m, text, prefijo, cmd }) => {
        const whatsappId = m.sender;
        const code = text?.trim()?.toUpperCase();
        if (!code) {
            return m.reply(`❌ Ingresa el código.\n\n📌 Ejemplo:\n${prefijo + cmd} C1F9AEC4`);
        }
        try {
            // buscar código válido
            const res = await db.query(`SELECT discord_id
         FROM discord_verify_codes
         WHERE whatsapp_id = $1
           AND code = $2
           AND expires_at > NOW()
         LIMIT 1`, [whatsappId, code]);
            if (!res.rowCount)
                return m.reply("❌ Código inválido o expirado.");
            const { discord_id } = res.rows[0];
            // ⚠️ OJO: tu PK es usuarios.id
            await db.query(`INSERT INTO usuarios (id, discord_id, discord_verified, discord_verified_at)
         VALUES ($1, $2, TRUE, NOW())
         ON CONFLICT (id)
         DO UPDATE SET
           discord_id = EXCLUDED.discord_id,
           discord_verified = TRUE,
           discord_verified_at = NOW()`, [whatsappId, discord_id]);
            // borrar código usado
            await db.query(`DELETE FROM discord_verify_codes WHERE whatsapp_id = $1`, [whatsappId]);
            return m.reply(`✅ *Verificación completada*\n\n` +
                `🔗 Discord vinculado correctamente.\n` +
                `🆔 Discord ID: ${discord_id}\n> 🎉 Ya puedes usar *.daily*`);
        }
        catch (e) {
            console.error("VERIFYCODE ERROR:", e);
            return m.reply("❌ Error al verificar el código.");
        }
    }
};
