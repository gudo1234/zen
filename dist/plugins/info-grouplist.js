import { db } from '../lib/db.js';
export default {
    name: ["grouplist"],
    help: ["grouplist"],
    desc: "Muestra la lista de grupos donde está el bot",
    tags: ["main"],
    register: true,
    run: async ({ conn, m }) => {
        const botId = conn.user?.id?.split(":")[0] || "unknown";
        const botNumber = botId.replace(/[^0-9]/g, "");
        await m.react("⏳");
        try {
            const res = await db.query(`SELECT group_id, bot_data 
         FROM chats 
         WHERE is_group = true 
         AND bot_data ? $1
         AND (bot_data->$1->>'joined')::boolean = true`, [botId]);
            const grupos = res.rows;
            if (grupos.length === 0) {
                await m.react("❌");
                return m.reply('❌ Este bot no está unido a ningún grupo.');
            }
            let txt = `_*\`ESTÁ EN ESTOS GRUPOS:\`*_\n`;
            txt += `> *• Total grupos:* ${grupos.length}\n\n`;
            for (let i = 0; i < grupos.length; i++) {
                const groupId = grupos[i].group_id;
                try {
                    const metadata = await conn.groupMetadata(groupId).catch(() => null);
                    if (!metadata)
                        continue;
                    // Verificar si el bot es admin
                    const bot = metadata.participants.find((u) => {
                        const uId = u.id?.replace(/:\d+/, "") || "";
                        const uPhone = u.phoneNumber?.replace(/:\d+/, "") || "";
                        return uId === botId || uPhone === botId || uId.includes(botNumber) || uPhone.includes(botNumber);
                    }) || {};
                    const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin';
                    const isParticipant = Boolean(bot?.id);
                    const participantStatus = isParticipant ? '✅ *Estoy aquí*' : '❌ *No estoy aquí*';
                    let link = 'No soy admin';
                    if (isBotAdmin) {
                        try {
                            const code = await conn.groupInviteCode(groupId);
                            if (code)
                                link = `https://chat.whatsapp.com/${code}`;
                            else
                                link = '⚠️ Error al generar link';
                        }
                        catch {
                            link = 'No tengo permisos';
                        }
                    }
                    txt += `${i + 1}. *${metadata.subject || 'Sin nombre'}* | ${participantStatus}\n`;
                    txt += `- *ID:* ${groupId}\n`;
                    txt += `- *Admin:* ${isBotAdmin ? '✅' : '❌'}\n`;
                    txt += `- *Participantes:* ${metadata.participants?.length || 0}\n`;
                    txt += `- *Link:* ${link}\n`;
                    txt += `━━━━━━━━━━━━━━━━\n\n`;
                }
                catch (e) {
                    console.error(`❌ Error obteniendo metadata del grupo ${groupId}:`, e);
                    txt += `${i + 1}. *Grupo ID:* ${groupId}\n`;
                    txt += `- ⚠️ No se pudo obtener información\n`;
                    txt += `━━━━━━━━━━━━━━━━\n\n`;
                }
            }
            await m.reply(txt.trim());
            await m.react("✅");
        }
        catch (err) {
            console.error("❌ Error en grouplist:", err);
            await m.react("❌");
            await m.reply(`${m.e.error} Error al obtener la lista de grupos.\n\n>>> ${err.message || err}`);
        }
    }
};
