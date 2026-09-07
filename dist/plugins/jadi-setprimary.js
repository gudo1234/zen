import { db } from "../lib/db.js";
async function getBotIdentifier(conn, chat, text, m) {
    const metadata = await conn.groupMetadata(chat);
    // 🔥 Obtener LID y JID del bot
    const botLidRaw = conn.user?.lid || "";
    const botLid = botLidRaw.replace(/:\d+/, ""); // LID limpio sin :2
    const botJid = conn.user?.id || "";
    console.log('🔍 [getBotIdentifier] botLid:', botLid, 'botJid:', botJid);
    // 🔥 1. Si mencionan a alguien
    if (m.mentionedJid?.length) {
        const mentioned = m.mentionedJid[0];
        const mentionedClean = mentioned.replace(/:\d+/, "");
        // 🔥 Si es LID (termina en @lid)
        if (mentioned.includes('@lid')) {
            // Buscar en participantes
            for (const p of metadata.participants || []) {
                const pLidClean = p.lid?.replace(/:\d+/, "") || "";
                if (pLidClean === mentionedClean || p.lid === mentioned) {
                    // 🔥 Devolver LID limpio
                    return p.lid?.replace(/:\d+/, "") || p.id;
                }
            }
            // Si no se encuentra, devolver el LID mencionado limpio
            return mentionedClean;
        }
        // 🔥 Si es número (termina en @s.whatsapp.net o es un número)
        if (mentioned.includes('@s.whatsapp.net') || /\d+/.test(mentioned)) {
            const num = mentioned.replace(/@s\.whatsapp\.net/, "").replace(/[^0-9]/g, "");
            return `${num}@s.whatsapp.net`;
        }
        return mentioned;
    }
    // 🔥 2. Si es un número escrito (texto plano)
    if (text && /\d+/.test(text)) {
        const num = text.replace(/\D/g, "");
        // Verificar si es un LID (número muy largo > 10 dígitos) o número normal
        if (num.length > 10) {
            // Es un LID (generalmente 14-15 dígitos)
            return `${num}@lid`;
        }
        else {
            // Es un número de teléfono
            return `${num}@s.whatsapp.net`;
        }
    }
    // 🔥 3. Si es el bot por nombre
    const isBot = text?.toLowerCase().includes("bot") ||
        text?.toLowerCase().includes("mitzuki") ||
        text?.includes(conn.user?.name || "");
    if (isBot) {
        // 🔥 Devolver LID del bot (sin :2)
        return botLid || botJid;
    }
    return null;
}
export default {
    name: ["setprimary"],
    help: ["setprimary @bot", "setprimary 0", "setprimary"],
    desc: "Define, elimina o consulta el bot principal de este grupo.",
    tags: ["jadibot"],
    group: true,
    admin: true,
    run: async ({ conn, m, text }) => {
        try {
            const chatId = m.chat;
            const arg = text?.trim() || "";
            if (!arg) {
                const res = await db.query(`SELECT primary_bot FROM chats WHERE group_id = $1`, [chatId]);
                const primary = res.rows[0]?.primary_bot;
                if (!primary)
                    return m.reply("ℹ️ No hay ningún bot principal establecido. Cualquiera puede responder aquí.");
                await m.reply(`🤖 *Bot principal actual:*\n${primary}`);
                return;
            }
            if (arg === "0") {
                await db.query(`UPDATE chats SET primary_bot = NULL WHERE group_id = $1`, [chatId]);
                await m.react("✅");
                await m.reply("✅ Se eliminó el bot principal. Ahora *cualquier bot* puede responder en este grupo.");
                return;
            }
            const botId = await getBotIdentifier(conn, chatId, text, m);
            if (!botId) {
                return m.reply("❌ No se pudo detectar un bot válido. Menciónalo o escribe su número.");
            }
            console.log('🔍 [SETPRIMARY] Guardando:', botId);
            await db.query(`INSERT INTO chats (group_id, primary_bot)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO UPDATE SET primary_bot = $2`, [chatId, botId]);
            await m.react("✅");
            await m.reply(`✅ El bot principal de este grupo ahora es:\n${botId}`);
        }
        catch (e) {
            console.error("❌ Error en /setprimary:", e);
            await m.reply("❌ Ocurrió un error al establecer o consultar el bot principal.");
        }
    }
};
