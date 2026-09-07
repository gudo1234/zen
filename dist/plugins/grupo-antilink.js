import { db } from "../lib/db.js";
export default {
    name: ["setantilink"],
    help: ["setantilink"],
    desc: "Configura el antilink del grupo",
    tags: ["grupo"],
    group: true,
    admin: true,
    run: async ({ conn, m, args, text }) => {
        if (!args.length) {
            const res = await db.query("SELECT antilink, antilink_prohibited, antilink_allowed, antilink_warn FROM chats WHERE group_id = $1", [m.chat]);
            const config = res.rows[0] || {};
            const isActive = config.antilink || false;
            const prohibited = config.antilink_prohibited || [];
            const allowedLinks = config.antilink_allowed || [];
            const warnLimit = config.antilink_warn || 0;
            let msg = `📋 *CONFIGURACIÓN ANTILINK*\n\n`;
            msg += `• *Estado:* ${isActive ? '✅ Activado' : '❌ Desactivado'}\n`;
            msg += `• *Advertencias:* ${warnLimit} (0 = eliminar directo)\n`;
            if (prohibited.length) {
                msg += `\n🚫 *Enlaces prohibidos:*\n`;
                prohibited.forEach((link, i) => {
                    msg += `  ${i + 1}. ${link}\n`;
                });
            }
            else {
                msg += `\n🚫 *Enlaces prohibidos:* Ninguno (solo los default)\n`;
            }
            if (allowedLinks.length) {
                msg += `\n✅ *Enlaces permitidos:*\n`;
                allowedLinks.forEach((link, i) => {
                    msg += `  ${i + 1}. ${link}\n`;
                });
            }
            msg += `\n📌 *Comandos:*\n`;
            msg += `• .on antilink - Activar\n`;
            msg += `• .off antilink - Desactivar\n`;
            msg += `• .setantilink add <enlace> - Agregar a prohibidos\n`;
            msg += `• .setantilink remove <número> - Quitar de prohibidos\n`;
            msg += `• .setantilink allowed <enlace> - Permitir enlace\n`;
            msg += `• .setantilink unallow <enlace> - Quitar permitido\n`;
            msg += `• .setantilink warn <0-3> - Configurar advertencias\n`;
            msg += `• .setantilink list - Ver lista completa`;
            return m.reply(msg);
        }
        const action = args[0].toLowerCase();
        const res = await db.query("SELECT antilink_prohibited, antilink_allowed, antilink_warn FROM chats WHERE group_id = $1", [m.chat]);
        let config = res.rows[0] || {};
        let prohibited = config.antilink_prohibited || [];
        let allowedLinks = config.antilink_allowed || [];
        let warnLimit = config.antilink_warn || 0;
        // ===== ADD =====
        if (action === 'add') {
            const newLink = args.slice(1).join(' ').trim().toLowerCase();
            if (!newLink)
                return m.reply('⚠️ Especifica el enlace a agregar.');
            if (prohibited.includes(newLink)) {
                return m.reply(`⚠️ El enlace *${newLink}* ya está en la lista de prohibidos.`);
            }
            if (allowedLinks.includes(newLink)) {
                return m.reply(`⚠️ El enlace *${newLink}* está en la lista de permitidos. No se puede prohibir.`);
            }
            prohibited.push(newLink);
            await db.query(`UPDATE chats SET antilink_prohibited = $1 WHERE group_id = $2`, [JSON.stringify(prohibited), m.chat]);
            return m.reply(`✅ Enlace *${newLink}* agregado a la lista de prohibidos.`);
        }
        // ===== REMOVE =====
        if (action === 'remove') {
            const index = parseInt(args[1]) - 1;
            if (isNaN(index) || index < 0 || index >= prohibited.length) {
                return m.reply(`⚠️ Número inválido. Usa .setantilink list para ver los enlaces.`);
            }
            const removed = prohibited[index];
            prohibited.splice(index, 1);
            await db.query(`UPDATE chats SET antilink_prohibited = $1 WHERE group_id = $2`, [JSON.stringify(prohibited), m.chat]);
            return m.reply(`✅ Enlace *${removed}* eliminado de la lista de prohibidos.`);
        }
        // ===== LIST =====
        if (action === 'list') {
            let msg = `📋 *LISTA DE ENLACES PROHIBIDOS*\n\n`;
            if (!prohibited.length) {
                msg += `No hay enlaces prohibidos configurados.\n`;
            }
            else {
                prohibited.forEach((link, i) => {
                    msg += `${i + 1}. ${link}\n`;
                });
            }
            msg += `\n⚠️ *Advertencias:* ${warnLimit} (0 = eliminar directo)\n`;
            if (allowedLinks.length) {
                msg += `\n✅ *Enlaces permitidos:*\n`;
                allowedLinks.forEach((link, i) => {
                    msg += `${i + 1}. ${link}\n`;
                });
            }
            return m.reply(msg);
        }
        // ===== WARN =====
        if (action === 'warn') {
            const limit = parseInt(args[1]);
            if (isNaN(limit) || limit < 0 || limit > 3) {
                return m.reply('⚠️ El límite debe ser entre 0 y 3.\n0 = eliminar directo | 1-3 = advertencias antes de eliminar');
            }
            warnLimit = limit;
            await db.query(`UPDATE chats SET antilink_warn = $1 WHERE group_id = $2`, [warnLimit, m.chat]);
            return m.reply(`✅ Límite de advertencias configurado a: *${warnLimit}*\n${warnLimit === 0 ? '🚫 Se eliminará directamente.' : `⚠️ Después de ${warnLimit} advertencias se eliminará.`}`);
        }
        // ===== ALLOWED (agregar a whitelist) =====
        if (action === 'allowed') {
            const newLink = args.slice(1).join(' ').trim().toLowerCase();
            if (!newLink)
                return m.reply('⚠️ Especifica el enlace a permitir. Ej: .setantilink allowed youtube.com');
            if (allowedLinks.includes(newLink)) {
                return m.reply(`⚠️ El enlace *${newLink}* ya está en la lista de permitidos.`);
            }
            // Si está en prohibidos, eliminarlo de ahí
            if (prohibited.includes(newLink)) {
                const idx = prohibited.indexOf(newLink);
                prohibited.splice(idx, 1);
                await db.query(`UPDATE chats SET antilink_prohibited = $1 WHERE group_id = $2`, [JSON.stringify(prohibited), m.chat]);
            }
            allowedLinks.push(newLink);
            await db.query(`UPDATE chats SET antilink_allowed = $1 WHERE group_id = $2`, [JSON.stringify(allowedLinks), m.chat]);
            return m.reply(`✅ Enlace *${newLink}* agregado a la lista de permitidos.`);
        }
        // ===== UNALLOW (quitar de whitelist) =====
        if (action === 'unallow') {
            const newLink = args.slice(1).join(' ').trim().toLowerCase();
            if (!newLink)
                return m.reply('⚠️ Especifica el enlace a despermir. Ej: .setantilink unallow youtube.com');
            const index = allowedLinks.indexOf(newLink);
            if (index === -1) {
                return m.reply(`⚠️ El enlace *${newLink}* no está en la lista de permitidos.`);
            }
            allowedLinks.splice(index, 1);
            await db.query(`UPDATE chats SET antilink_allowed = $1 WHERE group_id = $2`, [JSON.stringify(allowedLinks), m.chat]);
            return m.reply(`✅ Enlace *${newLink}* eliminado de la lista de permitidos.`);
        }
        return m.reply(`⚠️ Opción inválida. Usa: add, remove, list, warn, allowed, unallow`);
    }
};
