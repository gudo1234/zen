import { db } from "../lib/db.js";
export default {
    name: ["addgrupos", "delgrupos"],
    help: ["addgrupos", "delgrupos"],
    desc: "Agrega o quita grupos de la excepción del ban global.",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, args, prefijo, isOwner, isGroup, cmd }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        // === DELGRUPOS ===
        if (cmd === "delgrupos") {
            let groupId = m.chat;
            // Si se pasa un ID (desde privado)
            if (args[0] && args[0].includes("@g.us")) {
                groupId = args[0];
            }
            else if (args[0] && !isGroup) {
                return m.reply(`❌ ID inválido. Debe terminar en @g.us`);
            }
            const settings = await db.query("SELECT global_ban_exempt_groups FROM bot_settings WHERE bot_id = $1", [botId]);
            let exemptGroups = settings.rows[0]?.global_ban_exempt_groups || [];
            if (!exemptGroups.includes(groupId)) {
                return m.reply(`ℹ️ *Este grupo NO está en la excepción.*`);
            }
            exemptGroups = exemptGroups.filter(id => id !== groupId);
            await db.query(`UPDATE bot_settings SET global_ban_exempt_groups = $1 WHERE bot_id = $2`, [exemptGroups, botId]);
            return m.reply(`✅ *GRUPO QUITADO DE EXCEPCIÓN*\n\nID: ${groupId}`);
        }
        // === ADDGRUPOS ===
        if (cmd === "addgrupos") {
            let groupId = m.chat;
            // Si se pasa un link (desde privado)
            if (args[0] && args[0].includes("chat.whatsapp.com")) {
                try {
                    const code = args[0].match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
                    if (!code) {
                        return m.reply(`❌ Link inválido.`);
                    }
                    const result = await conn.groupAcceptInvite(code[1]);
                    if (result) {
                        groupId = result;
                        await db.query(`
              INSERT INTO chats (group_id, is_group, joined, bot_id)
              VALUES ($1, true, true, $2)
              ON CONFLICT (group_id) DO NOTHING
            `, [groupId, botId]);
                    }
                    else {
                        return m.reply(`❌ No se pudo unir al grupo.`);
                    }
                }
                catch (e) {
                    return m.reply(`❌ Error: ${e.message}`);
                }
            }
            if (isGroup || (args[0] && args[0].includes("chat.whatsapp.com"))) {
                try {
                    const metadata = await conn.groupMetadata(groupId);
                    const botId2 = conn.user?.id?.replace(/:\d+@/, "@");
                    const isBotInGroup = metadata.participants.some(p => {
                        const pid = p.id?.replace(/:\d+/, "");
                        return pid === botId2 || pid === (conn.user?.lid || "").replace(/:\d+/, "");
                    });
                    if (!isBotInGroup) {
                        return m.reply(`❌ El bot no está en este grupo.`);
                    }
                    const settings = await db.query("SELECT global_ban_exempt_groups FROM bot_settings WHERE bot_id = $1", [botId]);
                    let exemptGroups = settings.rows[0]?.global_ban_exempt_groups || [];
                    if (exemptGroups.includes(groupId)) {
                        return m.reply(`ℹ️ *Este grupo YA está en la excepción.*`);
                    }
                    exemptGroups.push(groupId);
                    await db.query(`UPDATE bot_settings SET global_ban_exempt_groups = $1 WHERE bot_id = $2`, [exemptGroups, botId]);
                    return m.reply(`✅ *GRUPO AGREGADO A EXCEPCIÓN*\n\n${metadata.subject || 'Sin nombre'}\nID: ${groupId}`);
                }
                catch (e) {
                    return m.reply(`❌ Error: ${e.message}`);
                }
            }
            return m.reply(`📌 *USO:*\n${prefijo}addgrupos - Agregar este grupo\n${prefijo}addgrupos link - Unirse y agregar grupo`);
        }
    }
};
