import { db } from "../lib/db.js";
export default {
    name: "banchat",
    help: ["banchat on/off", "banchat global on/off"],
    desc: "Banea o desbanea un chat o TODOS los chats de ESTE bot.",
    tags: ["jadibot", "owner"],
    owner: true,
    run: async ({ conn, m, args, prefijo, isOwner, isGroup }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        // === MOSTRAR AYUDA ===
        if (!args[0]) {
            if (isGroup) {
                const check = await db.query("SELECT banned FROM chats WHERE group_id = $1", [m.chat]);
                const isBanned = check.rows[0]?.banned === true;
                const status = isBanned ? "🚫 BANEADO" : "✅ ACTIVO";
                const globalCheck = await db.query("SELECT banned FROM bot_settings WHERE bot_id = $1", [botId]);
                const isGlobalBanned = globalCheck.rows[0]?.banned === true;
                return m.reply(`📌 *ESTADO DE ESTE BOT*\n\nChat actual: ${status}\nBan global de este bot: ${isGlobalBanned ? '🚫 ACTIVO' : '✅ INACTIVO'}\n\n*USO:*\n${prefijo}banchat on - Banear este grupo\n${prefijo}banchat off - Desbanear este grupo\n${prefijo}banchat global on - Banear TODOS los chats de ESTE bot (no responde a nadie)\n${prefijo}banchat global off - Desbanear TODOS los chats de ESTE bot (vuelve a responder a todos)`);
            }
            else {
                const globalCheck = await db.query("SELECT banned FROM bot_settings WHERE bot_id = $1", [botId]);
                const isGlobalBanned = globalCheck.rows[0]?.banned === true;
                return m.reply(`📌 *ESTADO DE ESTE BOT*\n\nBan global: ${isGlobalBanned ? '🚫 ACTIVO' : '✅ INACTIVO'}\n\n*USO:*\n${prefijo}banchat global on - Banear TODOS los chats de ESTE bot (no responde a nadie)\n${prefijo}banchat global off - Desbanear TODOS los chats de ESTE bot (vuelve a responder a todos)`);
            }
        }
        // === BAN GLOBAL (SOLO PARA ESTE BOT) ===
        if (args[0] === "global") {
            const action = args[1]?.toLowerCase();
            if (action === "on") {
                await db.query(`UPDATE bot_settings SET banned = true WHERE bot_id = $1`, [botId]);
                return m.reply(`🌍 *BANCHAT GLOBAL ACTIVADO PARA ESTE BOT*\n\nEl bot NO funcionará en NINGÚN chats.\nSolo el dueño puede desactivar: ${prefijo}banchat global off`);
            }
            else if (action === "off") {
                await db.query(`UPDATE bot_settings SET banned = false WHERE bot_id = $1`, [botId]);
                return m.reply(`🌍 *BANCHAT GLOBAL DESACTIVADO PARA ESTE BOT*\n\nEl bot vuelve a funcionar en todos los chats.`);
            }
            return m.reply(`⚠️ Usa: ${prefijo}banchat global on/off`);
        }
        // === BAN INDIVIDUAL (solo en grupos) ===
        if (!isGroup) {
            return m.reply(`❌ Este comando solo funciona en grupos.\n\nPara ban global usa: ${prefijo}banchat global on/off`);
        }
        const action = args[0]?.toLowerCase();
        if (action === "on") {
            const check = await db.query("SELECT banned FROM chats WHERE group_id = $1", [m.chat]);
            if (check.rows[0]?.banned) {
                return m.reply(`⚠️ *Este chat YA ESTÁ BANEADO*`);
            }
            await db.query(`UPDATE chats SET banned = true WHERE group_id = $1`, [m.chat]);
            return m.reply(`🚫 *CHAT BANEADO*\n\nEl bot NO funcionará aquí.\n\nPara desbanear: ${prefijo}banchat off`);
        }
        else if (action === "off") {
            const check = await db.query("SELECT banned FROM chats WHERE group_id = $1", [m.chat]);
            if (!check.rows[0]?.banned) {
                return m.reply(`ℹ️ *Este chat NO ESTÁ BANEADO*`);
            }
            await db.query(`UPDATE chats SET banned = false WHERE group_id = $1`, [m.chat]);
            return m.reply(`✅ *CHAT DESBANEADO*\n\nEl bot vuelve a funcionar aquí.`);
        }
        else {
            return m.reply(`❌ *COMANDO INVÁLIDO:* "${args[0]}"\n\n*USO:*\n${prefijo}banchat on - Banear este grupo\n${prefijo}banchat off - Desbanear este grupo\n${prefijo}banchat global on - Banear TODOS los grupos de ESTE bot\n${prefijo}banchat global off - Desbanear TODOS los grupos de ESTE bot`);
        }
    }
};
