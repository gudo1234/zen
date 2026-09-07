export default {
    name: ["group", "grupo", "abrir", "cerrar", "open", "close"],
    help: "group abrir/cerrar/daradmin/quitaradmin/eliminar/aprobar",
    desc: "Gestionar grupos: abrir/cerrar.",
    tags: ["group"],
    run: async ({ conn, m, args, prefijo, cmd, isOwner, isAdmin }) => {
        let groupId = m.isGroup ? m.chat : null;
        let action = "";
        let target = "";
        let identifier = "";
        if (cmd === "abrir" || cmd === "cerrar" || cmd === "open" || cmd === "close") {
            if (!m.isGroup)
                return m.reply(null, "⚠️ Este comando solo funciona en grupos.");
            if (!isAdmin && !isOwner)
                return m.reply(null, "⚠️ Solo admins pueden usar este comando.");
            try {
                if (cmd === "abrir" || cmd === "open") {
                    await conn.groupSettingUpdate(m.chat, "not_announcement");
                    return m.reply(`🟢 Grupo abierto.`, `Todos pueden escribir.`);
                }
                else {
                    await conn.groupSettingUpdate(m.chat, "announcement");
                    return m.reply(`🔒 Grupo cerrado.`, `Solo admins pueden escribir.`);
                }
            }
            catch (e) {
                return m.reply(`❌ Error: ${e?.message || e}`);
            }
        }
        if (!m.isGroup) {
            if (!isOwner)
                return m.reply(null, "⚠️ Solo el owner puede usar este comando en privado.");
            if (args.length < 2)
                return m.reply(`⚠️ Formato incorrecto.`, `\nEjemplos:\n${prefijo + cmd} id 123456@g.us abrir\n${prefijo + cmd} enlace https://chat.whatsapp.com/XXXX cerrar\n${prefijo + cmd} https://chat.whatsapp.com/XXXX daradmin +51987654321`);
            if (args[0].toLowerCase() === "id") {
                identifier = args[1];
                action = args[2]?.replace(/^-/, "").trim().toLowerCase() || "";
                target = args[3] ? args[3].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
                groupId = identifier;
            }
            else if (args[0].toLowerCase() === "enlace") {
                identifier = args[1];
                action = args[2]?.replace(/^-/, "").trim().toLowerCase() || "";
                target = args[3] ? args[3].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
                if (!/chat\.whatsapp\.com\//i.test(identifier)) {
                    return m.reply(null, "⚠️ Debes poner un enlace válido de WhatsApp.");
                }
                const inviteCode = identifier.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{20,24})/i)?.[1];
                if (!inviteCode)
                    return m.reply(null, "⚠️ Enlace inválido.");
                try {
                    const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
                    groupId = inviteInfo.id;
                }
                catch (e) {
                    return m.reply(null, "⚠️ No pude obtener el grupo desde ese enlace.");
                }
            }
            else if (/chat\.whatsapp\.com\//i.test(args[0])) {
                identifier = args[0];
                action = args[1]?.replace(/^-/, "").trim().toLowerCase() || "";
                target = args[2] ? args[2].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
                const inviteCode = identifier.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{20,24})/i)?.[1];
                if (!inviteCode)
                    return m.reply(null, "⚠️ Enlace inválido.");
                try {
                    const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
                    groupId = inviteInfo.id;
                }
                catch (e) {
                    return m.reply(null, "⚠️ No pude obtener información del grupo.");
                }
            }
            else {
                return m.reply(`⚠️ Usa:`, `${prefijo + cmd} id [ID] [acción]\n${prefijo + cmd} enlace [URL] [acción]\n${prefijo + cmd} [URL] [acción]`);
            }
        }
        else {
            if (!isAdmin && !isOwner)
                return m.reply(null, "⚠️ Solo admins pueden usar este comando.");
            action = args[0]?.toLowerCase() || "";
            target = m.mentionedJid?.[0] || (m.quoted?.sender) || (args[1] ? args[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "");
        }
        if (!groupId)
            return m.reply(null, "⚠️ No se pudo detectar el grupo.");
        if (!action)
            return m.reply(null, "⚠️ Debes indicar una acción.");
        try {
            switch (action) {
                case "abrir":
                case "open":
                case "abierto":
                    await conn.groupSettingUpdate(groupId, "not_announcement");
                    return m.reply("🟢 Grupo abierto.`, `Todos pueden escribir.");
                case "cerrar":
                case "close":
                case "cerrado":
                    await conn.groupSettingUpdate(groupId, "announcement");
                    return m.reply("🔒 Grupo cerrado.`, `Solo admins pueden escribir.");
                case "addadmin":
                case "promote":
                case "daradmin":
                    if (!target)
                        return m.reply(null, "⚠️ Debes mencionar, responder o poner un número.");
                    await conn.groupParticipantsUpdate(groupId, [target], "promote");
                    return m.reply(`✅ @${target.split("@")[0]}`, `ahora es admin.`);
                case "removeadmin":
                case "demote":
                case "quitaradmin":
                    if (!target)
                        return m.reply(null, "⚠️ Debes mencionar, responder o poner un número.");
                    await conn.groupParticipantsUpdate(groupId, [target], "demote");
                    return m.reply(`✅ @${target.split("@")[0]}`, `ya no es admin.`);
                case "kick":
                case "eliminar":
                case "remove":
                    if (!target)
                        return m.reply(null, "⚠️ Debes mencionar, responder o poner un número.");
                    await conn.groupParticipantsUpdate(groupId, [target], "remove");
                    return m.reply(`🗑️ @${target.split("@")[0]}`, `fue eliminado del grupo.`);
                case "aprobar":
                case "approve":
                    if (!target)
                        return m.reply(null, "⚠️ Debes poner un número.");
                    await conn.groupRequestParticipantsUpdate(groupId, [target], "approve");
                    return m.reply(`✅ @${target.split("@")[0]}`, `fue aprobado en el grupo.`);
                default:
                    return m.reply(`⚠️ Acción inválida.`, `\n*En grupo:*\n${prefijo}abrir\n${prefijo}cerrar\n${prefijo + cmd} daradmin @user\n${prefijo + cmd} quitaradmin @user\n${prefijo + cmd} eliminar @user\n${prefijo + cmd} aprobar 573XXXXXXXXX\n\n*En privado (owner):*\n${prefijo + cmd} id 123456@g.us abrir\n${prefijo + cmd} enlace https://chat.whatsapp.com/XXXX cerrar\n${prefijo + cmd} https://chat.whatsapp.com/XXXX daradmin +573XXXXXXXXX`);
            }
        }
        catch (e) {
            console.error(e);
            return m.reply(`❌ Error: ${e?.message || e}`);
        }
    }
};
