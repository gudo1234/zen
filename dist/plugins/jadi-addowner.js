import { getBotSettings, setBotSettings } from "../lib/db.js";
function cleanNumber(jid) {
    return (jid || "")
        .split("@")[0]
        .replace(/:\d+$/, "")
        .replace(/[^0-9]/g, "");
}
function getLid(jid) {
    if (!jid)
        return '';
    const clean = (jid || "")
        .split("@")[0]
        .replace(/:\d+$/, "");
    return clean;
}
export default {
    name: ["addowner", "delowner"],
    help: ["addowner @tag", "delowner @tag"],
    desc: "Agregar o eliminar owner del bot",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0];
        const args = body.split(/\s+/).slice(1);
        const meta = m.isGroup ? await conn.groupMetadata(m.chat) : null;
        // ===== DELOWNER =====
        if (cmd === "delowner") {
            let userId = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!userId && args[0]) {
                const num = args[0].replace(/[^0-9]/g, "");
                userId = `${num}@s.whatsapp.net`;
            }
            if (!userId)
                return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} @tag o +numero`);
            let targetNum = cleanNumber(userId);
            let targetLid = getLid(userId);
            // Si es LID, buscar número en participantes
            if (userId.includes('@lid') && meta) {
                const found = meta.participants.find(p => p.id === userId);
                if (found?.phoneNumber) {
                    targetNum = cleanNumber(found.phoneNumber);
                }
                targetLid = getLid(userId);
            }
            // Si es número, buscar LID en participantes
            if (!targetLid && meta && targetNum) {
                const found = meta.participants.find(p => {
                    const pNum = cleanNumber(p.phoneNumber);
                    return pNum === targetNum;
                });
                if (found?.id && found.id.includes('@lid')) {
                    targetLid = getLid(found.id);
                }
            }
            const config = await getBotSettings(botId);
            let owners = config.owners || [];
            // Buscar y eliminar por num o lid
            const initialLength = owners.length;
            owners = owners.filter((o) => {
                const oNum = o.num || '';
                const oLid = o.lid || '';
                return oNum !== targetNum && oLid !== targetLid;
            });
            if (owners.length === initialLength) {
                return m.reply(`${m.e.warn} El usuario no es owner del bot.`);
            }
            await setBotSettings(botId, { owners });
            return m.reply(`✅ Owner eliminado.`);
        }
        // ===== ADDOWNER =====
        let ownersToAdd = [];
        // 🔥 Detectar mencionados
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        for (const jid of mentioned) {
            const num = cleanNumber(jid);
            let lid = '';
            // Si es LID, buscar su número en los participantes
            if (jid.includes('@lid')) {
                lid = getLid(jid);
                if (meta) {
                    const found = meta.participants.find(p => p.id === jid);
                    if (found?.phoneNumber) {
                        const numFound = cleanNumber(found.phoneNumber);
                        if (numFound) {
                            ownersToAdd.push({ num: numFound, lid });
                            continue;
                        }
                    }
                }
            }
            if (num && num.length >= 10) {
                // Buscar LID del número en participantes
                let lidFound = '';
                if (meta) {
                    const found = meta.participants.find(p => {
                        const pNum = cleanNumber(p.phoneNumber);
                        return pNum === num;
                    });
                    if (found?.id && found.id.includes('@lid')) {
                        lidFound = getLid(found.id);
                    }
                }
                ownersToAdd.push({ num, lid: lidFound });
            }
        }
        // 🔥 Detectar números en args
        for (const arg of args) {
            let num = arg.replace(/^\+/, '').replace(/[^0-9]/g, '');
            if (num.length >= 10) {
                let lidFound = '';
                if (meta) {
                    const found = meta.participants.find(p => {
                        const pNum = cleanNumber(p.phoneNumber);
                        return pNum === num;
                    });
                    if (found?.id && found.id.includes('@lid')) {
                        lidFound = getLid(found.id);
                    }
                }
                ownersToAdd.push({ num, lid: lidFound });
            }
        }
        // 🔥 Detectar LID en args (ej: .addowner 35060220747880@lid)
        for (const arg of args) {
            if (arg.includes('@lid')) {
                const lid = getLid(arg);
                if (lid) {
                    let numFound = '';
                    if (meta) {
                        const found = meta.participants.find(p => p.id === arg);
                        if (found?.phoneNumber) {
                            numFound = cleanNumber(found.phoneNumber);
                        }
                    }
                    ownersToAdd.push({ num: numFound, lid });
                }
            }
        }
        // Eliminar duplicados
        const uniqueOwners = [];
        const seen = new Set();
        for (const owner of ownersToAdd) {
            if (owner.num && !seen.has(owner.num)) {
                seen.add(owner.num);
                uniqueOwners.push(owner);
            }
            else if (owner.lid && !seen.has(owner.lid)) {
                seen.add(owner.lid);
                uniqueOwners.push(owner);
            }
        }
        if (!uniqueOwners.length) {
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} +numero, @tag o @lid`);
        }
        const config = await getBotSettings(botId);
        let owners = config.owners || [];
        const added = [];
        for (const newOwner of uniqueOwners) {
            const exists = owners.some((o) => (o.num && o.num === newOwner.num) ||
                (o.lid && o.lid === newOwner.lid));
            if (!exists) {
                owners.push(newOwner);
                added.push(newOwner.num || newOwner.lid);
            }
        }
        if (!added.length)
            return m.reply(m.e.warn + " Ya son owners.");
        const ownersData = JSON.parse(JSON.stringify(owners));
        await setBotSettings(botId, { owners: ownersData });
        return m.reply(`✅ Owners agregados: ${added.join(", ")}`);
    }
};
