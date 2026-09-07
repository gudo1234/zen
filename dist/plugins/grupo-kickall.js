export default {
    name: ["kickall"],
    tags: ["owner"],
    group: true,
    owner: true,
    botAdmin: true,
    run: async ({ conn, m, participants }) => {
        try {
            const meta = await conn.groupMetadata(m.chat);
            const groupParticipants = participants || meta.participants || [];
            const botJid = conn.user?.jid || conn.user?.id;
            const owners = (global.owner || []).map(v => {
                if (Array.isArray(v))
                    return v[0] + "@s.whatsapp.net";
                return String(v).replace(/\D/g, "") + "@s.whatsapp.net";
            });
            const usuarios = groupParticipants.filter(u => !u.admin && !owners.includes(u.id) && u.id !== botJid).map(u => u.id);
            if (!usuarios.length)
                return m.reply("❌ No hay usuarios para expulsar.");
            await conn.groupUpdateSubject(m.chat, "...");
            await conn.groupUpdateDescription(m.chat, "Rechill");
            await conn.removeProfilePicture(m.chat).catch(console.error);
            await conn.groupParticipantsUpdate(m.chat, usuarios, "remove");
            await m.react("✅");
        }
        catch (e) {
            console.error("❌ Error al expulsar:", e);
            await m.reply("❌ Error al expulsar usuarios.");
        }
    }
};
