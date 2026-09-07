import { db, setBotSettings, getBotSettings } from "../lib/db.js";
export default {
    name: ["enable", "disable", "on", "off"],
    help: ["enable <opción>", "disable <opción>"],
    desc: "Activar o desactivar funciones",
    tags: ["nable"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd, isAdmin, isGroup, isOwner }) => {
        const isEnable = /^(enable|on)$/i.test(cmd);
        const type = (args[0] || "").toLowerCase();
        const chatId = m.chat;
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        let msg = "";
        switch (type) {
            case "welcome":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, welcome) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET welcome = $2`, [chatId, isEnable]);
                msg = `□ Bienvenida ${isEnable ? "activada ✅" : "desactivada ❌"}`;
                break;
            case "bye":
            case "despedidas":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, bye) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET bye = $2`, [chatId, isEnable]);
                msg = `□ Despedidas ${isEnable ? "activada ✅" : "desactivada ❌"}`;
                break;
            case "detect":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, detect) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET detect = $2`, [chatId, isEnable]);
                msg = `□ detectó ${isEnable ? "activada ✅" : "desactivada ❌"}`;
                break;
            case "audios":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, audios) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET audios = $2`, [chatId, isEnable]);
                msg = `□ AUDIOS AUTOMÁTICOS ${isEnable ? "activada ✅" : "desactivada ❌"}`;
                break;
            case "approve":
            case "autoapprove":
            case "aprobar":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, auto_approve)
     VALUES ($1,$2)
     ON CONFLICT (group_id) DO UPDATE SET auto_approve = $2`, [chatId, isEnable]);
                msg = `🟢 Auto-aprobación de solicitudes ${isEnable ? "activada ✅" : "desactivada ❌"}`;
                break;
            case "antifake":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, antifake) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET antifake = $2`, [chatId, isEnable]);
                msg = `□ antifake ${isEnable ? "activada ✅" : "desactivada ❌"}`;
                break;
            case "antilink":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, antilink) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET antilink = $2`, [chatId, isEnable]);
                msg = `🔗 Antilink ${isEnable ? "activado ✅" : "desactivado ❌"}`;
                break;
            case "antilink2":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, antilink2) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET antilink2 = $2`, [chatId, isEnable]);
                msg = `🔗 Antilink2 ${isEnable ? "activado ✅" : "desactivado ❌"}`;
                break;
            case "antinsfw":
            case "antiporno":
            case "antigore":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`
INSERT INTO chats (group_id, antinsfw)
VALUES ($1,$2)
ON CONFLICT (group_id)
DO UPDATE SET antinsfw = $2
`, [chatId, isEnable]);
                msg = `🔞 Anti NSFW ${isEnable ? "activado ✅" : "desactivado ❌"}`;
                break;
            case 'nsfw':
            case "modohorny":
            case "modocaliente":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, modohorny) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET modohorny = $2`, [chatId, isEnable]);
                msg = `🔗 MODO +18 ${isEnable ? "activado ✅" : "desactivado ❌"}`;
                break;
            case "antistatus":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, antistatus) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET antistatus = $2`, [chatId, isEnable]);
                msg = `🔗 AntiStatus ${isEnable ? "activado ✅" : "desactivado ❌"}`;
                break;
            case "autoresponder":
            case "modoia":
            case "chatgpt":
            case "ia":
            case "chatbot":
            case "ai":
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, autoresponder) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET autoresponder = $2`, [chatId, isEnable]);
                msg = `🤖 MODO CHATBOT ${isEnable ? "activado ✅" : "desactivado ❌"}`;
                break;
            case 'modoadmin':
            case 'onlyadmin':
                if (!m.isGroup)
                    return m.reply(m.e.warn + ` ${m.msg.group}`);
                if (!isAdmin)
                    return m.reply(m.e.warn + ` ${m.msg.admin}`);
                await db.query(`INSERT INTO chats (group_id, modoadmin) 
           VALUES ($1,$2) 
           ON CONFLICT (group_id) DO UPDATE SET modoadmin = $2`, [chatId, isEnable]);
                msg = `🔗 MODOADMIN ${isEnable ? "ACTIVADO ✅" : "DESACTIVADO ❌"}`;
                break;
            case "antiprivado":
            case "antiprivate":
                if (!isOwner)
                    return m.reply(m.e.warn + ` ${m.msg.owner}`);
                await setBotSettings(botId, { anti_private: isEnable });
                msg = `🚫 ANTIPRIVADO ${isEnable ? "ACTIVADO ✅" : "DESACTIVADO ❌"}`;
                break;
            case "antillamada":
            case "anticall":
                if (!isOwner)
                    return m.reply(m.e.warn + ` ${m.msg.owner}`);
                await setBotSettings(botId, { anti_call: isEnable });
                msg = `📵 ANTILLAMADAS ${isEnable ? "ACTIVADO ✅" : "DESACTIVADO ❌"}`;
                break;
            default:
                const comandoMostrar = isEnable ? 'enable' : 'disable';
                // OBTENER CONFIGURACIONES
                let config = {};
                if (m.isGroup) {
                    const res = await db.query(`SELECT 
    welcome, bye, detect, auto_approve, antifake, antilink, antilink2, 
    antinsfw, antistatus, autoresponder, anticall, modoadmin, banned
    FROM chats WHERE group_id = $1`, [chatId]);
                    config = res.rows[0] || {};
                }
                const botSettings = await getBotSettings(botId);
                // Construir tabla - Array de arrays simple
                let tabla = [];
                // HEADER GRUPO
                tabla.push(['', 'GRUPO', 'ESTADO', 'COMANDO']);
                // FUNCIONES DEL GRUPO
                const addRow = (name, emoji, status, desc, cmd) => {
                    const estado = status !== false ? '✅' : '❌';
                    tabla.push([`${emoji} ${name}`, desc, estado, `${prefijo}${comandoMostrar} ${cmd}`]);
                };
                addRow('Bienvenida', '👋', config.welcome, 'Mensaje al entrar', 'welcome');
                addRow('Despedidas', '👋', config.bye, 'Mensaje al salir', 'bye');
                addRow('Detección', '🔍', config.detect, 'Detecta cambios', 'detect');
                addRow('Autoaprobación', '✅', config.auto_approve, 'Aprueba solicitudes', 'autoapprove');
                addRow('Antifake', '🛡️', config.antifake, 'Bloquea números', 'antifake');
                addRow('Antilink', '🔗', config.antilink, 'Elimina enlaces', 'antilink');
                addRow('AntiNSFW', '🔞', config.antinsfw, 'Filtra +18', 'antinsfw');
                addRow('AntiStatus', '📱', config.antistatus, 'Bloquea estados', 'antistatus');
                addRow('MODO +18', '🥵', config.modohorny, 'Activa/desactivar contenidos +18', 'modohorny');
                addRow('AUDIOS', '😁', config.audios, 'Activa/desactivar los audios randow automático', 'audios');
                addRow('Modo IA', '🤖', config.autoresponder, 'Chatbot con IA', 'autoresponder');
                addRow('Modo Admin', '👑', config.modoadmin, 'Solo admins', 'modoadmin');
                // BANCHAT
                if (m.isGroup) {
                    const banEstado = config.banned ? '🚫 No Permitidos' : '✅ Permitidos';
                    tabla.push(['🚫 BanChat', 'Bloquea el bot en este grupo', banEstado, `${prefijo}banchat on/off`]);
                }
                // HEADER SOLO OWNER
                tabla.push(['', 'SOLO OWNER', '', '']);
                // FUNCIONES SOLO OWNER
                tabla.push(['🚫 AntiPrivado', 'Bloquea privados', botSettings.anti_private ? '✅' : '❌', `${prefijo}${comandoMostrar} antiprivado`]);
                tabla.push(['📵 AntiLlamadas', 'Bloquea llamadas', botSettings.anti_call ? '✅' : '❌', `${prefijo}${comandoMostrar} anticall`]);
                // BANCHAT GLOBAL
                const banGlobal = botSettings.banned ? '🚫 No Permitidos (baneado)' : '✅ Permitidos';
                tabla.push(['🌍 BanChat Global', 'Bloquea el bot en todos los grupos', banGlobal, `${prefijo}banchat global on/off`]);
                // ENVIAR MENSAJE CON TABLA
                await conn.sendMessage(m.chat, {
                    disclaimerText: '📋 LISTA DE FUNCIONES',
                    headerText: '## Configuración del Bot',
                    contentText: '---',
                    title: 'Funciones',
                    table: tabla,
                    noHeading: false,
                    footerText: `💡 Usa ${prefijo}enable o ${prefijo}disable para cambiar`
                }, { quoted: m });
        }
        await m.reply(msg);
    }
};
