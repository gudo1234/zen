import { db } from "../lib/db.js";
export default {
    name: ["addusers", "delusers"],
    help: ["addusers +num", "delusers +num"],
    desc: "Agrega o quita usuarios de la excepción del ban global.",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, args, prefijo, isOwner, cmd }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        if (!args[0]) {
            return m.reply(`📌 *USO:*\n${prefijo}${cmd} +573001234567`);
        }
        let phone = args[0].replace(/[^0-9]/g, "");
        if (!phone) {
            return m.reply(`❌ Número inválido.`);
        }
        const userId = `${phone}@s.whatsapp.net`;
        // Obtener la lista actual
        const settings = await db.query("SELECT global_ban_exempt_users FROM bot_settings WHERE bot_id = $1", [botId]);
        let exemptUsers = settings.rows[0]?.global_ban_exempt_users || [];
        // === DELUSERS ===
        if (cmd === "delusers") {
            if (!exemptUsers.includes(userId)) {
                return m.reply(`ℹ️ *Este usuario NO está en la excepción.*`);
            }
            exemptUsers = exemptUsers.filter(id => id !== userId);
            await db.query(`UPDATE bot_settings SET global_ban_exempt_users = $1 WHERE bot_id = $2`, [exemptUsers, botId]);
            return m.reply(`✅ *USUARIO QUITADO DE EXCEPCIÓN*\n\nID: ${userId}`);
        }
        // === ADDUSERS ===
        if (cmd === "addusers") {
            if (exemptUsers.includes(userId)) {
                return m.reply(`ℹ️ *Este usuario YA está en la excepción.*`);
            }
            exemptUsers.push(userId);
            await db.query(`UPDATE bot_settings SET global_ban_exempt_users = $1 WHERE bot_id = $2`, [exemptUsers, botId]);
            await db.query(`
        INSERT INTO usuarios (id, num, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [userId, phone, args[0]]);
            return m.reply(`✅ *USUARIO AGREGADO A EXCEPCIÓN*\n\nID: ${userId}`);
        }
    }
};
