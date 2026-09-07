import { db } from "../lib/db.js";
export default {
    name: ["nsfwarn", "nwarn"],
    help: ["nsfwarn <@user>", "nsfwarn list", "nsfwarn reset <@user>", "nsfwarn limit <1-10>"],
    desc: "Gestiona las advertencias NSFW del grupo",
    tags: ["admin"],
    admin: true,
    group: true,
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const chatId = m.chat;
        const action = args[0]?.toLowerCase() || "";
        // ============================================
        // 1. LISTAR advertencias
        // ============================================
        if (action === "list" || action === "lista") {
            const res = await db.query(`SELECT user_id, warns, last_reason, updated_at 
         FROM nsfw_warnings 
         WHERE group_id = $1 
         ORDER BY warns DESC`, [chatId]);
            if (res.rows.length === 0) {
                return m.reply("📊 *No hay advertencias NSFW en este grupo*");
            }
            let msg = "*📊 ADVERTENCIAS*\n\n";
            let total = 0;
            for (const row of res.rows) {
                const user = await conn.getName(row.user_id);
                const emoji = row.warns >= 2 ? "🔴" : "🟡";
                msg += `👥 *Usuarios:* ${res.rows.length}\n\n`;
                msg += `${emoji} @${row.user_id.split("@")[0]} - *${row.warns}* advertencias`;
                //  if (row.last_reason) msg += ` (${row.last_reason})`
                msg += `\n`;
                total += row.warns;
            }
            return m.reply(msg, { mentions: res.rows.map(r => r.user_id) });
        }
        // ============================================
        // 2. VER advertencias de un usuario
        // ============================================
        if (action === "ver" || action === "view") {
            const target = m.mentionedJid?.[0] || args[1];
            if (!target) {
                return m.reply(`⚠️ *Uso:* ${prefijo}${cmd} ver @usuario`);
            }
            const res = await db.query(`SELECT warns, last_reason, updated_at 
         FROM nsfw_warnings 
         WHERE group_id = $1 AND user_id = $2`, [chatId, target]);
            const user = await conn.getName(target);
            if (res.rows.length === 0) {
                return m.reply(`✅ @${target.split("@")[0]} *no tiene advertencias NSFW*`, { mentions: [target] });
            }
            const data = res.rows[0];
            const emoji = data.warns >= 2 ? "🔴" : "🟡";
            let msg = `*${emoji} ADVERTENCIAS DE @${target.split("@")[0]}*\n\n`;
            msg += `📊 *Total:* ${data.warns} advertencias\n`;
            if (data.last_reason)
                msg += `📝 *Última razón:* ${data.last_reason}\n`;
            msg += `📅 *Actualizado:* ${new Date(data.updated_at).toLocaleString()}\n`;
            const limit = await db.query("SELECT nsfw_warn_limit FROM chats WHERE group_id = $1", [chatId]);
            const maxLimit = limit.rows[0]?.nsfw_warn_limit || 3;
            msg += `\n⚠️ *Límite:* ${maxLimit} advertencias`;
            return m.reply(msg, { mentions: [target] });
        }
        // ============================================
        // 3. REINICIAR advertencias de un usuario
        // ============================================
        if (action === "reset" || action === "clear" || action === "borrar") {
            const target = m.mentionedJid?.[0] || args[1];
            if (!target) {
                return m.reply(`⚠️ *Uso:* ${prefijo}${cmd} reset @usuario`);
            }
            // Verificar si tiene advertencias
            const check = await db.query("SELECT warns FROM nsfw_warnings WHERE group_id = $1 AND user_id = $2", [chatId, target]);
            if (check.rows.length === 0) {
                return m.reply(`✅ @${target.split("@")[0]} *ya no tiene advertencias*`, { mentions: [target] });
            }
            await db.query(`DELETE FROM nsfw_warnings WHERE group_id = $1 AND user_id = $2`, [chatId, target]);
            const user = await conn.getName(target);
            return m.reply(`✅ *Advertencias NSFW reiniciadas para ${user}*`, { mentions: [target] });
        }
        // ============================================
        // 4. CAMBIAR LÍMITE de advertencias
        // ============================================
        if (action === "limit" || action === "limite") {
            const newLimit = parseInt(args[1]);
            if (!newLimit || newLimit < 1 || newLimit > 10) {
                return m.reply(`⚠️ *Uso:* ${prefijo}${cmd} limit <1-10>\n\n📌 Ejemplo: ${prefijo}${cmd} limit 5`);
            }
            await db.query(`
        INSERT INTO chats (group_id, nsfw_warn_limit)
        VALUES ($1, $2)
        ON CONFLICT (group_id) DO UPDATE SET nsfw_warn_limit = $2
      `, [chatId, newLimit]);
            return m.reply(`✅ *Límite de advertencias NSFW actualizado a ${newLimit}*`);
        }
        // ============================================
        // 5. AÑADIR advertencia manual
        // ============================================
        if (action === "add" || action === "añadir") {
            const target = m.mentionedJid?.[0];
            const reason = args.slice(2).join(" ") || "Contenido inapropiado";
            if (!target) {
                return m.reply(`⚠️ *Uso:* ${prefijo}${cmd} add @usuario <razón>`);
            }
            // Obtener advertencias actuales
            const current = await getUserWarnings(chatId, target);
            const newWarnings = current + 1;
            const limit = await getWarningLimit(chatId);
            // Incrementar
            await db.query(`INSERT INTO nsfw_warnings (group_id, user_id, warns, last_reason, updated_at)
         VALUES ($1, $2, 1, $3, NOW())
         ON CONFLICT (group_id, user_id)
         DO UPDATE SET 
           warns = nsfw_warnings.warns + 1,
           last_reason = $3,
           updated_at = NOW()
         RETURNING warns`, [chatId, target, reason]);
            const user = await conn.getName(target);
            let msg = `⚠️ *Advertencia NSFW añadida a ${user}*\n\n`;
            msg += `📊 *Total:* ${newWarnings}/${limit} advertencias\n`;
            msg += `📝 *Razón:* ${reason}`;
            // Si llegó al límite, expulsar
            if (newWarnings >= limit) {
                const botIsAdmin = await isBotAdmin(conn, chatId);
                if (botIsAdmin) {
                    await conn.groupParticipantsUpdate(chatId, [target], "remove");
                    await db.query(`DELETE FROM nsfw_warnings WHERE group_id = $1 AND user_id = $2`, [chatId, target]);
                    msg += `\n\n🚫 *Usuario eliminado por alcanzar el límite de advertencias*`;
                }
                else {
                    msg += `\n\n⚠️ *El usuario debería ser eliminado, pero no soy admin*`;
                }
            }
            return m.reply(msg, { mentions: [target] });
        }
        // ============================================
        // 6. AYUDA (sin acción)
        // ============================================
        const helpMsg = `*📋 COMANDOS NSFW WARN*

${prefijo}${cmd} list - Ver todas las advertencias
${prefijo}${cmd} ver @user - Ver advertencias de un usuario
${prefijo}${cmd} reset @user - Reiniciar advertencias
${prefijo}${cmd} limit <1-10> - Cambiar límite de advertencias

📌 *Ejemplos:*
${prefijo}${cmd} list
${prefijo}${cmd} ver @elrebelde21
${prefijo}${cmd} reset @elrebelde21
${prefijo}${cmd} limit 5

> ⚠️ *Solo admins pueden usar este comando*`;
        return m.reply(helpMsg);
    }
};
// Funciones auxiliares
async function getUserWarnings(groupId, userId) {
    try {
        const res = await db.query("SELECT warns FROM nsfw_warnings WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
        return res.rows[0]?.warns || 0;
    }
    catch {
        return 0;
    }
}
async function getWarningLimit(groupId) {
    try {
        const res = await db.query("SELECT nsfw_warn_limit FROM chats WHERE group_id = $1", [groupId]);
        return res.rows[0]?.nsfw_warn_limit || 3;
    }
    catch {
        return 3;
    }
}
async function isBotAdmin(conn, chatId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const botId = conn.user?.id?.replace(/:\d+@/, "@");
        return metadata.participants.some(p => {
            const pid = p.id?.replace(/:\d+/, "");
            return (pid === botId || pid === (conn.user?.lid || "").replace(/:\d+/, "")) && p.admin;
        });
    }
    catch {
        return false;
    }
}
