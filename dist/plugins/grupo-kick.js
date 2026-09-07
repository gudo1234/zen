import { getBotSettings } from "../lib/db.js";
import { OWNERS } from "../handler.js";
function soloNumeros(jid) {
    if (!jid)
        return '';
    return String(jid).replace(/[^0-9]/g, '');
}
function getLid(jid) {
    if (!jid)
        return '';
    if (jid.includes('@lid')) {
        // 🔥 Limpiar :63@lid -> @lid
        return jid.replace(/:\d+@lid/, '@lid');
    }
    return '';
}
export default {
    name: ["kick", "expulsar"],
    help: ["kick @usuario o responde un mensaje"],
    desc: "Expulsa a un miembro del grupo.",
    tags: ["grupo"],
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ conn, m, participants }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        const meta = await conn.groupMetadata(m.chat);
        let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        const config = await getBotSettings(botId);
        const botOwners = config.owners || [];
        const txt = `${m.e.warn} Etiqueta o responde al usuario que deseas eliminar.`;
        if (!target)
            return m.reply(txt);
        const targetNum = soloNumeros(target);
        const targetLid = getLid(target);
        let targetRealNum = targetNum;
        if (target.includes('@lid')) {
            const found = meta.participants.find(p => p.id === target);
            if (found?.phoneNumber) {
                targetRealNum = soloNumeros(found.phoneNumber);
            }
        }
        const botNum = soloNumeros(conn.user?.id || '');
        const botLid = getLid(conn.user?.lid || '');
        const senderNum = soloNumeros(m.sender || '');
        const senderLid = getLid(m.lid || '');
        const isGlobalOwner = OWNERS.some(o => {
            const oNum = o.num || '';
            const oLid = o.lid || '';
            return oNum === targetRealNum || oLid === targetLid;
        });
        const isBotOwner = botOwners.some((o) => {
            const oNum = o.num || '';
            const oLid = o.lid || '';
            return oNum === targetRealNum || oLid === targetLid;
        });
        if (isGlobalOwner || isBotOwner)
            return m.reply("⚠️ Jaja quiere eliminar a mi jefe?, pobre inútil");
        if (targetRealNum === botNum || targetLid === botLid)
            return m.reply("😾 No puedo eliminarme a mí mismo.");
        if (targetRealNum === senderNum || targetLid === senderLid)
            return m.reply("🙄 No puedes eliminarte tú mismo.");
        try {
            await conn.groupParticipantsUpdate(m.chat, [target], "remove");
            m.react("✅");
        }
        catch (e) {
            m.react("❌");
            console.error("❌ Error al expulsar:", e);
        }
    }
};
