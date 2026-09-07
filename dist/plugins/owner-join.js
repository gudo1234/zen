import { db } from "../lib/db.js";
const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
const ownerNumber = "573042648888";
const limit_join = 30;
export default {
    name: ["join", "unete"],
    help: ["join"],
    tags: ["owner"],
    desc: "Solicita que el bot se una a un grupo",
    private: true,
    register: true,
    run: async ({ conn, m, text, prefijo, isOwner, isROwner }) => {
        const esOwner = isOwner || isROwner;
        const sender = m.sender;
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        const botConfig = await db.query("SELECT * FROM bot_settings WHERE bot_id = $1", [botId]);
        const prestar = botConfig.rows[0]?.prestar !== undefined ? botConfig.rows[0].prestar : false;
        let quotedText = "";
        if (m.quoted) {
            if (m.quoted.message?.extendedTextMessage?.text) {
                quotedText = m.quoted.message.extendedTextMessage.text;
            }
            else if (m.quoted.message?.conversation) {
                quotedText = m.quoted.message.conversation;
            }
            else if (m.quoted.message?.imageMessage?.caption) {
                quotedText = m.quoted.message.imageMessage.caption;
            }
            else if (m.quoted.message?.videoMessage?.caption) {
                quotedText = m.quoted.message.videoMessage.caption;
            }
            else if (m.quoted.message?.documentMessage?.caption) {
                quotedText = m.quoted.message.documentMessage.caption;
            }
            else if (m.quoted.text) {
                quotedText = m.quoted.text;
            }
        }
        let allText = `${quotedText}\n${text}`;
        let link = allText.match(linkRegex)?.[0];
        let [_, code] = link ? link.match(linkRegex) : [];
        if (!code)
            return m.reply(`🤔 𝙔 𝙚𝙡 𝙚𝙣𝙡𝙖𝙘𝙚? 𝙄𝙣𝙜𝙧𝙚𝙨𝙖 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙫𝙖́𝙡𝙞𝙙𝙤.\n\n📝 *¿𝘾𝙤́𝙢𝙤 𝙪𝙨𝙖𝙧?*\n${prefijo}join <enlace> [tiempo]\n\n📌 *Ejemplos:*\n${prefijo}join https://chat.whatsapp.com/xxxxx 30 minuto\n${prefijo}join https://chat.whatsapp.com/xxxxx 2 hora\n${prefijo}join https://chat.whatsapp.com/xxxxx 1 día`);
        let waMeMatch = allText.match(/wa\.me\/(\d{8,})/);
        let solicitante = waMeMatch ? waMeMatch[1] : sender.split('@')[0];
        let esSolicitud = false;
        if (m.quoted) {
            const quotedText2 = m.quoted.message?.extendedTextMessage?.text || "";
            if (quotedText2.includes("SOLICITUD DE BOT") || quotedText2.includes("wa.me/")) {
                esSolicitud = true;
            }
        }
        let time = 30;
        let unit = "minuto";
        let tieneTiempo = false;
        const fullText = quotedText + "\n" + text;
        let timeMatch = null;
        const match1 = fullText.match(/⏳\s*𝙏𝙞𝙚𝙢𝙥𝙤:\s*(\d+)\s*(\w+)/i);
        if (match1)
            timeMatch = match1;
        if (!timeMatch) {
            const match2 = fullText.match(/⏰\s*Tiempo:\s*(\d+)\s*(\w+)/i);
            if (match2)
                timeMatch = match2;
        }
        if (!timeMatch) {
            const match3 = fullText.match(/Tiempo:\s*(\d+)\s*(\w+)/i);
            if (match3)
                timeMatch = match3;
        }
        if (!timeMatch) {
            const match4 = fullText.match(/(\d+)\s*(minuto|hora|día|dias|mes)/i);
            if (match4)
                timeMatch = match4;
        }
        if (timeMatch) {
            time = parseInt(timeMatch[1]);
            let rawUnit = timeMatch[2].toLowerCase();
            if (rawUnit.includes('minuto') || rawUnit === 'min')
                unit = 'minuto';
            else if (rawUnit.includes('hora') || rawUnit === 'hr' || rawUnit === 'hrs')
                unit = 'hora';
            else if (rawUnit.includes('día') || rawUnit.includes('dias') || rawUnit === 'day' || rawUnit === 'days')
                unit = 'día';
            else if (rawUnit.includes('mes') || rawUnit === 'month' || rawUnit === 'months')
                unit = 'mes';
            tieneTiempo = true;
        }
        else {
            if (esOwner && !esSolicitud) {
                tieneTiempo = false;
            }
            else {
                time = 30;
                unit = 'minuto';
                tieneTiempo = true;
            }
        }
        let timeInMs = 0;
        if (tieneTiempo) {
            if (unit === 'minuto')
                timeInMs = time * 60 * 1000;
            else if (unit === 'hora')
                timeInMs = time * 60 * 60 * 1000;
            else if (unit === 'día')
                timeInMs = time * 24 * 60 * 60 * 1000;
            else if (unit === 'mes')
                timeInMs = time * 30 * 24 * 60 * 60 * 1000;
        }
        const horas = timeInMs / (60 * 60 * 1000);
        const costoTotal = Math.ceil(horas * limit_join);
        const { rows } = await db.query('SELECT limite FROM usuarios WHERE id = $1', [sender]);
        const limite = rows[0]?.limite ?? 0;
        if (!prestar && !esOwner) {
            await m.reply(`✧━━━ *𝙎𝙊𝙇𝙄𝘾𝙄𝙏𝙐𝘿 𝙀𝙉𝙑𝙄𝘼𝘿𝘼* ━━━✧\n\n𝙎𝙪 𝙚𝙣𝙡𝙖𝙘𝙚 𝙨𝙚 𝙚𝙣𝙫𝙞𝙤́ 𝙖𝙡 𝙢𝙞 𝙥𝙧𝙤𝙥𝙞𝙚𝙩𝙖𝙧𝙞𝙤(𝙖)*.\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n⚠️ *𝙎𝙪 𝙜𝙧𝙪𝙥𝙤 𝙨𝙚𝙧𝙖́ 𝙚𝙫𝙖𝙡𝙪𝙖𝙙𝙤 𝙮 𝙦𝙪𝙚𝙙𝙖𝙧𝙖́ 𝙖 𝙙𝙚𝙘𝙞𝙨𝙞𝙤́𝙣 𝙙𝙚𝙡 𝙢𝙞 𝙥𝙧𝙤𝙥𝙞𝙚𝙩𝙖𝙧𝙞𝙤(𝙖).*\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n💌 *𝙇𝙖𝙨 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙪𝙙 𝙥𝙪𝙚𝙙𝙚 𝙩𝙖𝙧𝙙𝙖𝙧 𝙝𝙤𝙧𝙖𝙨 𝙚𝙣 𝙨𝙚𝙧 𝙧𝙚𝙨𝙥𝙤𝙣𝙙𝙞𝙙𝙖𝙨. 𝙋𝙤𝙧 𝙛𝙖𝙫𝙤𝙧 𝙩𝙚𝙣𝙚𝙧 𝙥𝙖𝙘𝙞𝙚𝙣𝙘𝙞𝙖*\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n⏰ *Tiempo solicitado:* ${time} ${unit}${time > 1 ? 's' : ''}\n${m.e.currency_emoji} *Costo:* ${costoTotal} ${m.e.currency_name}`);
            let ownerJid = `${ownerNumber}@s.whatsapp.net`;
            if (ownerJid !== conn.user?.jid) {
                await conn.sendMessage(ownerJid, { text: `*⪨ 𝙎𝙊𝙇𝙄𝘾𝙄𝙏𝙐𝘿 𝘿𝙀 𝘽𝙊𝙏 ⪩*\n\n👤 𝙉𝙪𝙢𝙚𝙧𝙤 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙣𝙩𝙚:\nwa.me/${sender.split('@')[0]}\n🔮 𝙇𝙞𝙣𝙠 𝙙𝙚𝙡 𝙜𝙧𝙪𝙥𝙤:\n${link}\n\n⏳ 𝙏𝙞𝙚𝙢𝙥𝙤: ${time} ${unit}${time > 1 ? 's' : ''}\n${m.e.currency_emoji} 𝘾𝙤𝙨𝙩𝙤: ${costoTotal} ${m.e.currency_name}\n\n> ➜ Responde a este mensaje con *${prefijo}join* para aceptar.`, contextInfo: { mentionedJid: [sender] } });
            }
            return;
        }
        if (prestar || esOwner) {
            let usuarioPagador = sender;
            if (esSolicitud) {
                const quotedText2 = m.quoted.message?.extendedTextMessage?.text || "";
                const waMeMatch2 = quotedText2.match(/wa\.me\/(\d{8,})/);
                if (waMeMatch2) {
                    usuarioPagador = `${waMeMatch2[1]}@s.whatsapp.net`;
                }
            }
            const esOwnerDirecto = esOwner && !esSolicitud;
            const esOwnerSinTiempo = esOwnerDirecto && !tieneTiempo;
            // 🔥 SI ES OWNER → NO COBRAR
            if (esOwnerDirecto) {
                await m.reply(`😎 Espere 3 segundos, me uniré al grupo${tieneTiempo ? ` (con tiempo: ${time} ${unit})` : ' (sin expiración)'}`); //`
            }
            else if (tieneTiempo) {
                // Solo usuarios normales pagan
                const { rows: userRows } = await db.query('SELECT limite FROM usuarios WHERE id = $1', [usuarioPagador]);
                const limiteUser = userRows[0]?.limite ?? 0;
                if (limiteUser < costoTotal) {
                    return m.reply(`❌ *El usuario no tiene suficientes créditos*\n\nNecesita: *${costoTotal} ${m.e.currency_name}*\nTiene: *${limiteUser} ${m.e.currency_name}*\n\n⏰ Tiempo: ${time} ${unit}${time > 1 ? 's' : ''}`);
                }
                await db.query('UPDATE usuarios SET limite = limite - $1 WHERE id = $2', [costoTotal, usuarioPagador]);
                await m.reply(`😎 Espere 3 segundos, me uniré al grupo\n\n${m.e.currency_emoji} *Costo:* ${costoTotal} ${m.e.currency_name}\n✅ ${m.e.currency_name} restantes: *${limiteUser - costoTotal}*`);
            }
            else {
                // Sin tiempo y no owner
                await m.reply(`😎 Espere 3 segundos, me uniré al grupo (sin expiración)`);
            }
            let res;
            try {
                res = await conn.groupAcceptInvite(code);
            }
            catch (e) {
                console.error("Error al unirse al grupo:", e);
                const msg = String(e?.message || e?.output?.payload?.message || e || "").toLowerCase();
                const statusCode = e?.output?.statusCode || e?.statusCode;
                let errorMsg;
                if (msg.includes("account_reachout_restricted")) {
                    errorMsg = `🚫 *Mi cuenta está restringida por WhatsApp para unirse a grupos*\n\n_Esto pasa cuando WhatsApp detecta muchas uniones a grupos en poco tiempo o considera la cuenta de riesgo._\n\n⏳ Suele levantarse solo después de algunas horas. Si persiste, contacta al propietario del bot.`;
                }
                else if (msg.includes("not-authorized") || statusCode === 401) {
                    errorMsg = `🔒 *No tengo autorización para unirme*\n\nEs posible que el enlace ya no sea válido o que me hayan bloqueado en ese grupo.`;
                }
                else if (msg.includes("conflict") || statusCode === 409) {
                    errorMsg = `⚠️ *Ya soy parte de este grupo* o hay un conflicto con mi estado actual en él.`;
                }
                else if (msg.includes("gone") || statusCode === 410) {
                    errorMsg = `🔗 *El enlace de invitación ya no es válido*\n\nProbablemente expiró o fue revocado. Pide un enlace nuevo.`;
                }
                else if (msg.includes("item-not-found") || statusCode === 404) {
                    errorMsg = `❓ *No encontré ningún grupo con ese enlace*\n\nRevisa que el enlace esté completo y bien copiado.`;
                }
                else if (msg.includes("forbidden") || statusCode === 403) {
                    errorMsg = `⛔ *El grupo no permite que me una*\n\nPuede que me hayan expulsado antes o que el grupo restrinja nuevas entradas.`;
                }
                else if (msg.includes("rate-overlimit") || statusCode === 429) {
                    errorMsg = `⏱️ *Estoy haciendo demasiadas solicitudes de este tipo*\n\nEspera unos minutos antes de volver a intentarlo.`;
                }
                else if (statusCode === 500) {
                    errorMsg = `🌐 *WhatsApp tuvo un problema interno al procesar la solicitud*\n\nIntenta de nuevo en unos minutos.`;
                }
                else {
                    errorMsg = `❌ *No pude unirme al grupo*\n\n_Detalle:_ ${e?.message || "error desconocido"}\n\nVerifica el enlace e inténtalo de nuevo.`;
                }
                return m.reply(errorMsg);
            }
            // 🔎 Cuando el grupo tiene "aprobación de admin" activada, WhatsApp
            // registra la solicitud pero groupAcceptInvite NO devuelve el JID real
            // del grupo (res sale undefined/null/vacío). En ese caso sacamos el
            // group_id directo del link de invitación con groupGetInviteInfo,
            // que sí funciona sin ser miembro todavía.
            if (!res) {
                try {
                    const inviteInfo = await conn.groupGetInviteInfo(code);
                    res = inviteInfo?.id;
                    console.log(`ℹ️ [JOIN] group_id obtenido vía groupGetInviteInfo: ${res}`);
                }
                catch (e) {
                    console.error("Error al obtener info del enlace de invitación:", e);
                }
            }
            if (!res) {
                console.error("❌ [JOIN] No se pudo determinar el group_id del enlace.");
                return m.reply("❌ Mi solicitud fue enviada, pero no pude identificar el grupo. Intenta de nuevo en unos segundos.");
            }
            console.log(`✅ [JOIN] Solicitud/entrada procesada: ${res}`);
            await new Promise(r => setTimeout(r, 3000));
            // 🔒 El grupo puede tener "aprobación de administrador" activada.
            // En ese caso groupAcceptInvite NO lanza error (WhatsApp acepta la
            // solicitud), pero el bot todavía no es miembro real, así que
            // groupMetadata falla con "missing <group> node". Guardamos todo lo
            // necesario en bot_data (pending:true) para que, cuando el admin
            // acepte y el bot entre de verdad, el listener de
            // group-participants.update complete el flujo solo (expiración +
            // presentación), sin que el usuario tenga que hacer nada más.
            let groupMeta;
            try {
                groupMeta = await conn.groupMetadata(res);
            }
            catch (e) {
                const msg = String(e?.message || e?.output?.payload?.message || e || "");
                const statusCode = e?.output?.statusCode || e?.statusCode;
                const esModoAprobacion = msg.includes("missing <group> node") ||
                    msg.includes("Invalid group metadata") ||
                    msg.includes("rate-overlimit") ||
                    statusCode === 500;
                if (esModoAprobacion) {
                    console.log(`⏳ [JOIN] Grupo ${res} tiene aprobación de admin activada. Esperando aceptación.`);
                    const pendingData = {
                        joined: false,
                        pending: true,
                        tieneTiempo,
                        timeInMs,
                        time,
                        unit,
                        solicitante,
                        esOwnerDirecto
                    };
                    await db.query(`INSERT INTO chats (group_id, bot_data)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (group_id) DO UPDATE SET
           bot_data =
             CASE
               WHEN chats.bot_data IS NULL OR chats.bot_data = '{}'::jsonb
               THEN $2::jsonb
               ELSE chats.bot_data || $2::jsonb
             END`, [res, JSON.stringify({ [botId]: pendingData })]);
                    return m.reply(`⏳ *𝙈𝙤𝙙𝙤 𝙖𝙥𝙧𝙤𝙗𝙖𝙘𝙞𝙤́𝙣 𝙙𝙚𝙩𝙚𝙘𝙩𝙖𝙙𝙤*\n\nMi solicitud ya fue enviada, solo falta que un admin del grupo la acepte. Cuando eso pase, entraré y me presentaré automáticamente.`);
                }
                console.error("Error al obtener metadata del grupo:", e);
                return m.reply("❌ Me uní pero no pude leer la información del grupo. Intenta de nuevo en unos segundos.");
            }
            let groupName = groupMeta.subject || "este grupo";
            const expiresAt = tieneTiempo && timeInMs > 0 ? Date.now() + timeInMs : 0;
            const botData = {
                joined: true,
                expired: expiresAt
            };
            await db.query(`INSERT INTO chats (group_id, bot_data) 
         VALUES ($1, $2::jsonb)
         ON CONFLICT (group_id) DO UPDATE SET 
           bot_data = 
             CASE 
               WHEN chats.bot_data IS NULL OR chats.bot_data = '{}'::jsonb 
               THEN $2::jsonb
               ELSE chats.bot_data || $2::jsonb
             END`, [res, JSON.stringify({ [botId]: botData })]);
            const verify = await db.query('SELECT group_id, bot_data FROM chats WHERE group_id = $1', [res]);
            console.log(`✅ [JOIN] Verificación DB:`, JSON.stringify(verify.rows[0]?.bot_data, null, 2));
            let mes = "";
            if (esOwnerDirecto) {
                mes = `Hola a todos 👋🏻\n\nSoy *${conn.user?.name || "Mitzuki"}*.\nMe uní por orden del dueño.\nPara ver el menú escribe: *${prefijo}menu*${tieneTiempo ? `\n\nEl bot saldrá automáticamente después de:\n${time} ${unit}${time > 1 ? 's' : ''}` : ''}`; //`
            }
            else if (tieneTiempo && timeInMs > 0) {
                mes = `Hola a todos 👋🏻\n\nSoy *${conn.user?.name || "Mitzuki"}*.\nFui invitado por *@${solicitante}*\nPara ver el menú escribe: *${prefijo}menu*\n\nEl bot saldrá automáticamente después de:\n${time} ${unit}${time > 1 ? 's' : ''}`;
            }
            else {
                mes = `Hola a todos 👋🏻\n\nSoy *${conn.user?.name || "Mitzuki"}*.\nFui invitado por *@${solicitante}*\nPara ver el menú escribe: *${prefijo}menu*`;
            }
            await conn.sendMessage(res, { text: mes, contextInfo: { mentionedJid: [`${solicitante}@s.whatsapp.net`] } });
            let tiempoTexto = esOwnerSinTiempo ? "Ilimitado" : `${time} ${unit}${time > 1 ? 's' : ''}`;
            await m.reply(`✅ *El Bot se ha unido al grupo*\n📋 Grupo: ${groupName}\n⏰ Tiempo: ${tiempoTexto}`);
        }
    }
};
