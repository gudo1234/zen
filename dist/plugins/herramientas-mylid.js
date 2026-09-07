export default {
    name: ["mylid", "miid", "myid"],
    help: ["mylid"],
    desc: "Muestra tu ID y LID, o el de un usuario mencionado",
    tags: ["tools"],
    group: true,
    run: async ({ conn, m, args }) => {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
        if (args.length > 0 && !m.mentionedJid) {
            const num = args[0].replace(/[^0-9]/g, '');
            if (num)
                target = `${num}@s.whatsapp.net`;
        }
        if (!target)
            target = m.sender;
        let id = target;
        let lid = '';
        // Si es LID, buscar número en participantes
        if (target.includes('@lid') && m.isGroup) {
            try {
                const meta = await conn.groupMetadata(m.chat);
                const found = meta.participants.find((p) => p.id === target);
                if (found?.phoneNumber) {
                    id = found.phoneNumber;
                }
                lid = target.replace(/:\d+@lid/, '@lid');
            }
            catch (e) { }
        }
        // Si es número, buscar LID en participantes
        if (!lid && m.isGroup) {
            try {
                const meta = await conn.groupMetadata(m.chat);
                const num = target.replace(/[^0-9]/g, '');
                const found = meta.participants.find((p) => {
                    const pNum = p.phoneNumber?.replace(/[^0-9]/g, '');
                    return pNum === num;
                });
                if (found?.id && found.id.includes('@lid')) {
                    lid = found.id.replace(/:\d+@lid/, '@lid');
                }
                if (found?.phoneNumber) {
                    id = found.phoneNumber;
                }
            }
            catch (e) { }
        }
        // Si es número y no tiene @, agregarlo
        if (!id.includes('@')) {
            const num = id.replace(/[^0-9]/g, '');
            id = `${num}@s.whatsapp.net`;
        }
        const msg = `🆔 *ID:* ${id}\n🔑 *LID:* ${lid || 'No disponible'}`;
        await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
    }
};
