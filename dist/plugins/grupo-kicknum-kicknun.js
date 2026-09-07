export default {
    name: ["kicknum", "listanum", "listnum"],
    help: "kicknum +52 / listnum +52",
    desc: "Buscar numero por prefijo o eliminar.",
    tags: ["group"],
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ conn, m, args, cmd }) => {
        if (!args[0])
            return m.reply(`⚠️ Ingresa un prefijo válido.\nEjemplo: .${cmd} +52`);
        const prefijo = args[0].replace(/\+/g, "").replace(/[^0-9]/g, "");
        if (!prefijo)
            return m.reply(`⚠️ El prefijo debe ser numérico.\nEjemplo: .${cmd} +52`);
        let metadata;
        try {
            metadata = await conn.groupMetadata(m.chat);
        }
        catch (e) {
            return m.reply("❌ No pude obtener los participantes del grupo.");
        }
        const botJid = (conn.user?.id || "").replace(/:\d+/, "");
        const participants = metadata.participants || [];
        const encontrados = participants.map(p => (p.id || p.jid || "").replace(/:\d+/, "")).filter(jid => jid && jid !== botJid && jid.endsWith("@s.whatsapp.net") && jid.split("@")[0].startsWith(prefijo));
        if (!encontrados.length)
            return m.reply(`📵 No hay ningún número con prefijo +${prefijo} en este grupo.`);
        const numeros = encontrados.map(v => `⭔ @${v.split("@")[0]}`);
        if (["listanum", "listnum"].includes(cmd)) {
            return conn.sendMessage(m.chat, { text: `📋 Números encontrados con prefijo +${prefijo}:\n\n${numeros.join("\n")}`, mentions: encontrados }, { quoted: m });
        }
        if (cmd === "kicknum") {
            const owners = Array.isArray(global.owner) ? global.owner.map(v => Array.isArray(v) ? `${String(v[0]).replace(/[^0-9]/g, "")}@s.whatsapp.net` : `${String(v).replace(/[^0-9]/g, "")}@s.whatsapp.net`) : [];
            const protegidos = new Set([botJid, ...owners]);
            let eliminables = encontrados.filter(user => !protegidos.has(user));
            if (!eliminables.length)
                return m.reply("⚠️ No hay usuarios eliminables con ese prefijo.");
            await m.reply(`⚠️ Iniciando eliminación de números con prefijo +${prefijo}...\n> Se eliminará uno cada 10 segundos.`);
            let eliminados = 0;
            let fallidos = 0;
            for (const user of eliminables) {
                try {
                    const r = await conn.groupParticipantsUpdate(m.chat, [user], "remove");
                    if (Array.isArray(r) && r[0]?.status && String(r[0].status) !== "200") {
                        fallidos++;
                        await conn.sendMessage(m.chat, { text: `⚠️ No se pudo eliminar a @${user.split("@")[0]}`, mentions: [user] }, { quoted: m });
                    }
                    else {
                        eliminados++;
                    }
                }
                catch (e) {
                    fallidos++;
                    await conn.sendMessage(m.chat, { text: `⚠️ No se pudo eliminar a @${user.split("@")[0]}`, mentions: [user] }, { quoted: m });
                }
                await delay(10000);
            }
            return m.reply(`✅ Proceso terminado.\n\n• Eliminados: ${eliminados}\n• Fallidos: ${fallidos}`);
        }
    }
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
