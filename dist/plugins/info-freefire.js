import { db } from "../lib/db.js";
const TIPOS = ["4vs4", "6vs6", "8vs8", "12vs12", "16vs16", "20vs20", "24vs24"];
export default {
    name: [...TIPOS, "entraff", "saleff", "listaff", "cerrarff", "setiniciales", "reglaslideres", "reglaslideres2", "donarsala", "iniciales"],
    help: [...TIPOS, "entraff", "saleff", "listaff", "cerrarff", "setiniciales", "reglaslideres", "reglaslideres2", "donarsala", "iniciales"],
    tags: ["freefire"],
    desc: "Comandos de partidas Free Fire",
    group: true,
    run: async ({ conn, m, args, text, prefijo, cmd, isAdmin, isOwner, isROwner }) => {
        const groupId = m.chat;
        const command = cmd.toLowerCase();
        const esOwner = isOwner || isROwner;
        const sender = m.sender;
        // ============================================
        // setiniciales
        // ============================================
        if (command === "setiniciales") {
            if (!isAdmin && !esOwner)
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            const txt = text.trim();
            if (!txt)
                return m.reply(`❌ Escribe las iniciales.\nEj: ${prefijo}setiniciales Texto`);
            await db.query(`INSERT INTO freefire (group_id, type, date, time, creator, players)
         VALUES ($1, 'iniciales', $2, '', '', '{}')
         ON CONFLICT (group_id, type) DO UPDATE SET date = EXCLUDED.date`, [groupId, txt]);
            await m.react("✅");
            return m.reply(`✅ Iniciales guardadas:\n📝 "${txt}"`);
        }
        // ============================================
        // reglaslideres
        // ============================================
        if (command === "reglaslideres") {
            if (!isAdmin && !esOwner)
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            const txt = text.trim();
            if (!txt)
                return m.reply(`❌ Escribe las reglas.\nEj: ${prefijo}reglaslideres Texto`);
            await db.query(`INSERT INTO freefire (group_id, type, date, time, creator, players)
         VALUES ($1, 'reglaslideres', $2, '', '', '{}')
         ON CONFLICT (group_id, type) DO UPDATE SET date = EXCLUDED.date`, [groupId, txt]);
            await m.react("✅");
            return m.reply(`✅ Reglas lideres guardadas:\n📝 "${txt}"`);
        }
        // ============================================
        // reglaslideres2
        // ============================================
        if (command === "reglaslideres2") {
            if (!isAdmin && !esOwner)
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            const txt = text.trim();
            if (!txt)
                return m.reply(`❌ Escribe las reglas 2.\nEj: ${prefijo}reglaslideres2 Texto`);
            await db.query(`INSERT INTO freefire (group_id, type, date, time, creator, players)
         VALUES ($1, 'reglaslideres2', $2, '', '', '{}')
         ON CONFLICT (group_id, type) DO UPDATE SET date = EXCLUDED.date`, [groupId, txt]);
            await m.react("✅");
            return m.reply(`✅ Reglas lideres 2 guardadas:\n📝 "${txt}"`);
        }
        // ============================================
        // donarsala
        // ============================================
        if (command === "donarsala") {
            if (!isAdmin && !esOwner)
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            const txt = text.trim();
            if (!txt)
                return m.reply(`❌ Escribe el texto de donar sala.\nEj: ${prefijo}donarsala Texto`);
            await db.query(`INSERT INTO freefire (group_id, type, date, time, creator, players)
         VALUES ($1, 'donarsala', $2, '', '', '{}')
         ON CONFLICT (group_id, type) DO UPDATE SET date = EXCLUDED.date`, [groupId, txt]);
            await m.react("✅");
            return m.reply(`✅ Donar sala guardada:\n📝 "${txt}"`);
        }
        // ============================================
        // Mostrar configuraciones
        // ============================================
        if (["iniciales", "reglaslideres", "reglaslideres2", "donarsala"].includes(command)) {
            const res = await db.query("SELECT date FROM freefire WHERE group_id = $1 AND type = $2", [groupId, command]);
            if (res.rows.length === 0) {
                const nombres = {
                    iniciales: "Iniciales",
                    reglaslideres: "Reglas de lideres",
                    reglaslideres2: "Reglas de lideres 2",
                    donarsala: "Donar sala"
                };
                return m.reply(`📭 No hay *${nombres[command]}* configurado.\n\nUn admin puede ponerlo con *.set${command}*`);
            }
            return m.reply(res.rows[0].date);
        }
        // ============================================
        // CREAR PARTIDA O VER DETALLES
        // ============================================
        if (TIPOS.includes(command)) {
            if (!isAdmin && !esOwner)
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            const date = args[0] || "";
            const time = args[1] || "";
            // Si NO tiene fecha y hora, mostrar detalles de la partida activa
            if (!date || !time) {
                const partida = await db.query("SELECT * FROM freefire WHERE group_id = $1 AND type = $2 AND active = true", [groupId, command]);
                if (partida.rows.length === 0) {
                    return m.reply(`❌ No hay una partida *${command.toUpperCase()}* activa.\n\n` +
                        `Un admin puede crearla con:\n${prefijo}${command} <fecha> <hora>\n` +
                        `Ej: ${prefijo}${command} 10/08/2026 20:00`);
                }
                const p = partida.rows[0];
                const players = p.players || [];
                const max = p.type.split("vs")[0] === "24" ? 48 : parseInt(p.type.split("vs")[0]) * 2;
                const mentions = [p.creator];
                let detalle = `🎮 *PARTIDA ${p.type.toUpperCase()}*\n\n`;
                detalle += `📅 Fecha: ${p.date}\n`;
                detalle += `⏰ Hora: ${p.time}\n`;
                detalle += `👤 Creador: @${p.creator.split("@")[0]}\n`;
                detalle += `👥 Jugadores: ${players.length}/${max}\n\n`;
                if (players.length === 0) {
                    detalle += `📭 No hay jugadores aún. Usa *.entraff* para unirte.`;
                }
                else {
                    detalle += `📋 *JUGADORES:*\n`;
                    for (let i = 0; i < players.length; i++) {
                        const jid = players[i];
                        mentions.push(jid);
                        detalle += `${i + 1}. @${jid.split("@")[0]}\n`;
                    }
                }
                return m.reply(detalle, mentions);
            }
            // Si TIENE fecha y hora, crear la partida
            const existente = await db.query("SELECT * FROM freefire WHERE group_id = $1 AND type = $2 AND active = true", [groupId, command]);
            if (existente.rows.length > 0) {
                const p = existente.rows[0];
                return m.reply(`⚠️ Ya hay una partida *${p.type}* activa.\n📅 ${p.date} - ⏰ ${p.time}\n\nCierra con *.cerrarff* o espera que termine.`);
            }
            await db.query(`INSERT INTO freefire (group_id, type, date, time, creator, players, active)
         VALUES ($1, $2, $3, $4, $5, '{}', true)`, [groupId, command, date, time, sender]);
            await m.react("✅");
            return m.reply(`🎮 *PARTIDA ${command.toUpperCase()} CREADA*\n\n` +
                `📅 Fecha: ${date}\n` +
                `⏰ Hora: ${time}\n` +
                `👤 Creador: @${sender.split("@")[0]}\n\n` +
                `Usa *.entraff* para unirte\n` +
                `Usa *.saleff* para salir\n` +
                `Usa *.listaff* para ver todas las partidas`, [sender]);
        }
        // ============================================
        // .entra - Unirse a la partida
        // ============================================
        if (command === "entraff") {
            const partidas = await db.query("SELECT * FROM freefire WHERE group_id = $1 AND active = true AND type != 'iniciales' AND type != 'reglaslideres' AND type != 'reglaslideres2' AND type != 'donarsala'", [groupId]);
            if (partidas.rows.length === 0) {
                return m.reply(`❌ No hay ninguna partida activa. Un admin debe crear una.`);
            }
            const arg = args[0] || "";
            let partidaSeleccionada = null;
            // Si el argumento es un número (ej: .entra 1)
            const num = parseInt(arg);
            if (!isNaN(num) && num >= 1 && num <= partidas.rows.length) {
                partidaSeleccionada = partidas.rows[num - 1];
            }
            // Si el argumento es un tipo (ej: .entra 4vs4)
            if (!partidaSeleccionada && arg) {
                const tipoArg = arg.toLowerCase();
                for (const p of partidas.rows) {
                    if (p.type.toLowerCase() === tipoArg) {
                        partidaSeleccionada = p;
                        break;
                    }
                }
            }
            // Si no se encontró partida y hay varias, mostrar lista
            if (!partidaSeleccionada && partidas.rows.length > 1) {
                let msg = `📋 *PARTIDAS ACTIVAS*\n\n`;
                for (let i = 0; i < partidas.rows.length; i++) {
                    const p = partidas.rows[i];
                    const players = p.players || [];
                    const max = p.type.split("vs")[0] === "24" ? 48 : parseInt(p.type.split("vs")[0]) * 2;
                    msg += `${i + 1}. *${p.type}* - ${p.date} ${p.time} (${players.length}/${max})\n`;
                }
                msg += `\nUsa *.entraff <número>* o *.entraff <tipo>*\nEj: *.entraff 1* o *.entraff 4vs4*`;
                return m.reply(msg);
            }
            // Si no se encontró y solo hay una, usar esa
            if (!partidaSeleccionada) {
                partidaSeleccionada = partidas.rows[0];
            }
            // Si el argumento era un tipo pero no existe
            if (arg && !partidaSeleccionada) {
                return m.reply(`❌ No hay una partida *${arg}* activa.\n\nUsa *.entraff* para ver las partidas disponibles.`);
            }
            const p = partidaSeleccionada;
            let players = p.players || [];
            if (players.includes(sender)) {
                return m.reply(`⚠️ @${sender.split("@")[0]} ya estás en la partida *${p.type}*.`, [sender]);
            }
            players.push(sender);
            await db.query("UPDATE freefire SET players = $1 WHERE id = $2", [players, p.id]);
            const total = players.length;
            const max = p.type.split("vs")[0] === "24" ? 48 : parseInt(p.type.split("vs")[0]) * 2;
            return m.reply(`✅ @${sender.split("@")[0]} se unió a la partida *${p.type}*\n\n` +
                `👥 Jugadores: ${total}/${max}`, [sender]);
        }
        // ============================================
        // .sale - Salir de la partida
        // ============================================
        if (command === "saleff") {
            const partidas = await db.query("SELECT * FROM freefire WHERE group_id = $1 AND active = true AND $2 = ANY(players)", [groupId, sender]);
            if (partidas.rows.length === 0) {
                return m.reply(`⚠️ @${sender.split("@")[0]} no estás en ninguna partida.`, [sender]);
            }
            const arg = args[0] || "";
            let partidaSeleccionada = null;
            // Si el argumento es un número
            const num = parseInt(arg);
            if (!isNaN(num) && num >= 1 && num <= partidas.rows.length) {
                partidaSeleccionada = partidas.rows[num - 1];
            }
            // Si el argumento es un tipo
            if (!partidaSeleccionada && arg) {
                const tipoArg = arg.toLowerCase();
                for (const p of partidas.rows) {
                    if (p.type.toLowerCase() === tipoArg) {
                        partidaSeleccionada = p;
                        break;
                    }
                }
            }
            // Si no se encontró y hay varias, mostrar lista
            if (!partidaSeleccionada && partidas.rows.length > 1) {
                let msg = `📋 *PARTIDAS DONDE ESTÁS*\n\n`;
                for (let i = 0; i < partidas.rows.length; i++) {
                    const p = partidas.rows[i];
                    msg += `${i + 1}. *${p.type}* - ${p.date} ${p.time}\n`;
                }
                msg += `\nUsa *.saleff <número>* o *.saleff <tipo>*\nEj: *.saleff 1* o *.saleff 4vs4*`;
                return m.reply(msg);
            }
            if (!partidaSeleccionada) {
                partidaSeleccionada = partidas.rows[0];
            }
            if (arg && !partidaSeleccionada) {
                return m.reply(`❌ No estás en una partida *${arg}*.`);
            }
            const p = partidaSeleccionada;
            let players = p.players || [];
            players = players.filter(j => j !== sender);
            await db.query("UPDATE freefire SET players = $1 WHERE id = $2", [players, p.id]);
            return m.reply(`✅ @${sender.split("@")[0]} salió de la partida *${p.type}*.`, [sender]);
        }
        // ============================================
        // .lista - Ver todas las partidas activas
        // ============================================
        if (command === "listaff") {
            const partidas = await db.query("SELECT * FROM freefire WHERE group_id = $1 AND active = true AND type != 'iniciales' AND type != 'reglaslideres' AND type != 'reglaslideres2' AND type != 'donarsala' ORDER BY type", [groupId]);
            if (partidas.rows.length === 0) {
                return m.reply(`❌ No hay partidas activas.`);
            }
            let lista = `🎮 *PARTIDAS ACTIVAS*\n\n`;
            const mentions = [];
            for (const p of partidas.rows) {
                const players = p.players || [];
                const max = p.type.split("vs")[0] === "24" ? 48 : parseInt(p.type.split("vs")[0]) * 2;
                mentions.push(p.creator);
                lista += `╭─ *${p.type.toUpperCase()}*\n`;
                lista += `│ 📅 ${p.date} - ⏰ ${p.time}\n`;
                lista += `│ 👤 Creador: @${p.creator.split("@")[0]}\n`;
                lista += `│ 👥 ${players.length}/${max} jugadores\n`;
                if (players.length > 0) {
                    for (let i = 0; i < Math.min(players.length, 5); i++) {
                        const jid = players[i];
                        mentions.push(jid);
                        lista += `│   ${i + 1}. @${jid.split("@")[0]}\n`;
                    }
                    if (players.length > 5) {
                        lista += `│   ... y ${players.length - 5} más\n`;
                    }
                }
                else {
                    lista += `│   📭 Sin jugadores\n`;
                }
                lista += `╰────────────────\n\n`;
            }
            lista += `Usa *.entraff <número>* o *.entraff <tipo>* para unirte\n`;
            lista += `Ej: *.entraff 1* o *.entraff 4vs4*`;
            return m.reply(lista, mentions);
        }
        // ============================================
        // .cerrar - Cerrar partida
        // ============================================
        if (command === "cerrarff") {
            if (!isAdmin && !esOwner)
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            const partidas = await db.query("SELECT * FROM freefire WHERE group_id = $1 AND active = true AND type != 'iniciales' AND type != 'reglaslideres' AND type != 'reglaslideres2' AND type != 'donarsala'", [groupId]);
            if (partidas.rows.length === 0) {
                return m.reply(`❌ No hay partidas activas.`);
            }
            const arg = args[0] || "";
            let partidaSeleccionada = null;
            const num = parseInt(arg);
            if (!isNaN(num) && num >= 1 && num <= partidas.rows.length) {
                partidaSeleccionada = partidas.rows[num - 1];
            }
            if (!partidaSeleccionada && arg) {
                const tipoArg = arg.toLowerCase();
                for (const p of partidas.rows) {
                    if (p.type.toLowerCase() === tipoArg) {
                        partidaSeleccionada = p;
                        break;
                    }
                }
            }
            if (!partidaSeleccionada && partidas.rows.length > 1) {
                let msg = `📋 *PARTIDAS ACTIVAS*\n\n`;
                const mentions = [];
                for (let i = 0; i < partidas.rows.length; i++) {
                    const p = partidas.rows[i];
                    const players = p.players || [];
                    mentions.push(p.creator);
                    msg += `${i + 1}. *${p.type}* - ${p.date} ${p.time} (${players.length} jugadores)\n`;
                    msg += `   👤 Creador: @${p.creator.split("@")[0]}\n`;
                }
                msg += `\nUsa *.cerrarff <número>* o *.cerrarff <tipo>*\nEj: *.cerrarff 1* o *.cerrarff 4vs4*`;
                return m.reply(msg, mentions);
            }
            if (!partidaSeleccionada) {
                partidaSeleccionada = partidas.rows[0];
            }
            if (arg && !partidaSeleccionada) {
                return m.reply(`❌ No hay una partida *${arg}* activa.`);
            }
            const p = partidaSeleccionada;
            const players = p.players || [];
            await db.query("UPDATE freefire SET active = false WHERE id = $1", [p.id]);
            let resumen = `🔚 *PARTIDA ${p.type.toUpperCase()} CERRADA*\n\n`;
            resumen += `📅 ${p.date} - ⏰ ${p.time}\n`;
            resumen += `👥 Total jugadores: ${players.length}\n\n`;
            const mentions = [];
            if (players.length > 0) {
                resumen += `📋 *JUGADORES:*\n`;
                for (let i = 0; i < players.length; i++) {
                    const jid = players[i];
                    mentions.push(jid);
                    resumen += `${i + 1}. @${jid.split("@")[0]}\n`;
                }
            }
            else {
                resumen += `📭 No hubo jugadores.`;
            }
            return m.reply(resumen, mentions);
        }
    }
};
