// @ts-nocheck
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import { smsg } from "./lib/simple.js";
import { logCommand } from "./lib/logger.js";
import { loadPlugins, getPlugin, getPlugins, runBefore, runAfter } from "./lib/plugins.js";
import { getPrefix, db, getBotSettings } from "./lib/db.js";
export const OWNERS = [
    { num: "50492280729", lid: "76803058192389@lid" },
    { num: "5492266613038", lid: "35060220747880@lid" },
    { num: "573042648888", lid: "267658821955719@lid" },
    { num: "5356666669", lid: "48223943188564@lid" },
    { num: "50488723207", lid: "94880558792752@lid" }
];
async function computeStickerHash(buffer) {
    const crypto = await import('crypto');
    try {
        const sharp = (await import('sharp')).default;
        const { data, info } = await sharp(buffer, { animated: false })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const hasher = crypto.createHash('sha256');
        hasher.update(`${info.width}x${info.height}x${info.channels}`);
        hasher.update(data);
        return hasher.digest('hex');
    }
    catch (e) {
        console.log("⚠️ No se pudo normalizar el sticker con sharp, usando hash crudo:", e.message);
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
}
/*interface Command {
  name: string | string[];  // Si name es array, ajusta según tu código
  command?: string[]
  tags?: string[]
  owner?: boolean
  rowner?: boolean
  admin?: boolean
  group?: boolean
  private?: boolean
  register?: boolean
  run: (options: {
    conn: WASocket;
    m: proto.IWebMessageInfo & {
      chat: string;
      sender: string;
      reply: (text: string) => Promise<void>;
    };
    text: string;
    args: string[];
    body: string;
    prefijo: string;
    cmd: string;
  }) => Promise<void>;
}

export const commands: Map<string, Command> = new Map()*/
const groupCache = new NodeCache({ stdTTL: 300 }); // 5 minutos
// 🔥 Agregá una función para forzar actualización:
async function getGroupMetadataForce(sock, jid, force = false) {
    if (force) {
        groupCache.del(jid); // Eliminar caché
        const meta = await sock.groupMetadata(jid);
        groupCache.set(jid, meta);
        return meta;
    }
    let meta = groupCache.get(jid);
    if (!meta) {
        meta = await sock.groupMetadata(jid);
        groupCache.set(jid, meta);
    }
    return meta;
}
loadPlugins();
function cleanNumber(jid) {
    return (jid || "")
        .split("@")[0]
        .replace(/:\d+$/, "")
        .replace(/[^0-9]/g, "");
}
async function getGroupMetadataCached(sock, jid) {
    let meta = groupCache.get(jid);
    if (!meta) {
        meta = await sock.groupMetadata(jid);
        groupCache.set(jid, meta);
    }
    return meta;
}
export async function participantsUpdate(conn, update) {
    const { id: groupId, participants, action, author } = update;
    const botId = conn.user?.id?.split(":")[0] || "mainbot";
    const settings2 = await getBotSettings(botId);
    const jid = settings2?.newsletter_jid || "120363285614743024@newsletter";
    const name = settings2?.newsletter_name || "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx";
    const isActive = jid && jid !== "" && jid !== "off";
    try {
        const check = await db.query("SELECT primary_bot, welcome, bye FROM chats WHERE group_id = $1", [groupId]);
        const settings_bot = check.rows[0] || {};
        const primaryBot = settings_bot.primary_bot || null;
        const myJid = (conn.user?.id || "").replace(/:\d+/, "");
        if (primaryBot && primaryBot.trim() !== "" && primaryBot !== myJid) {
            console.log(`🤖 ${myJid} omitió bienvenida en ${groupId}, bot primario es ${primaryBot}`);
            return;
        }
        const res = await db.query("SELECT * FROM chats WHERE group_id = $1", [groupId]);
        const settings = res.rowCount > 0 ? res.rows[0] : {
            welcome: true,
            bye: false,
            detect: true,
            photowelcome: false,
            photobye: false,
            swelcome: null,
            sbye: null,
            spromote: null,
            sdemote: null,
            antifake: false,
            antifake_prefixes: [],
            santifakemsg: "🚫 Número prohibido detectado: @user fue eliminado del grupo."
        };
        const metadata = await getGroupMetadataCached(conn, groupId);
        const groupName = metadata.subject || "Grupo";
        const groupDesc = metadata.desc || "*ᴜɴ ɢʀᴜᴘᴏ ɢᴇɴɪᴀ😸*\n *sɪɴ ʀᴇɢʟᴀ 😉*";
        for (const p of participants) {
            const participantId = typeof p === "string" ? p : (p.id || p.phoneNumber || "");
            if (!participantId)
                continue;
            const userTag = `@${participantId.split("@")[0]}`;
            const authorTag = author ? `@${author.split("@")[0]}` : "alguien";
            let text = "";
            let isPhoto = false;
            let ppUrl = "https://telegra.ph/file/39fb047cdf23c790e0146.jpg";
            // === ANTIFAKE ===
            if (action === "add" && settings.antifake) {
                const prefixes = Array.isArray(settings.antifake_prefixes) ? settings.antifake_prefixes : typeof settings.antifake_prefixes === "string" ? settings.antifake_prefixes.split(/[,\s]+/).filter(p => p) : [];
                const jid = typeof p === "string" ? p : (p.id || p.phoneNumber || "");
                if (!jid)
                    continue;
                let realNum = "";
                if (jid.endsWith("@lid")) {
                    const current = participants.find(x => x.id === jid);
                    if (current?.phoneNumber) {
                        realNum = current.phoneNumber
                            .replace("@s.whatsapp.net", "")
                            .replace(/[^0-9]/g, "");
                    }
                    else {
                        const found = metadata.participants?.find(x => x.id === jid);
                        if (found?.phoneNumber) {
                            realNum = found.phoneNumber
                                .replace("@s.whatsapp.net", "")
                                .replace(/[^0-9]/g, "");
                        }
                        else {
                            console.log("⚪ No se pudo resolver número desde metadata ni evento para:", jid);
                            continue;
                        }
                    }
                }
                else {
                    realNum = jid.replace("@s.whatsapp.net", "").replace(/[^0-9]/g, "");
                }
                const match = prefixes.some(pref => realNum.startsWith(pref.replace("+", "")));
                if (match) {
                    console.log("🚫 ANTIFAKE: Eliminando número prohibido:", realNum);
                    const msg = settings.santifakemsg || "⚠️ @user fue eliminado automáticamente por *número no permitido*.";
                    await conn.sendMessage(groupId, { text: msg.replace(/@user/gi, `@${realNum}`), mentions: [`${realNum}@s.whatsapp.net`] });
                    await conn.groupParticipantsUpdate(groupId, [jid], "remove").catch(e => console.log("❌ Error al eliminar:", e));
                    continue;
                }
            }
            let title;
            let body;
            switch (action) {
                case "add":
                    if (!settings.welcome)
                        return;
                    text = settings.swelcome || `HOLAA!! ${userTag} ¿COMO ESTAS?😃\n\n『Bienvenido A *${groupName}*』\n\nUn gusto conocerte amig@ 🤗\n\n_Recuerda leer las reglas del grupo para no tener ningun problema 🧐_\n\n*Solo disfrutar de este grupo y divertite 🥳*`;
                    isPhoto = settings.photowelcome;
                    title = "🌟 WELCOME 🌟";
                    body = "Bienvenido al grupo 🤗";
                    if (isPhoto) {
                        ppUrl = await conn.profilePictureUrl(participantId, "image").catch(() => ppUrl);
                    }
                    break;
                case "remove":
                    const botIdForRemove = conn.user?.id?.split(":")[0] || "unknown";
                    await db.query(`UPDATE chats 
     SET bot_data = 
       CASE 
         WHEN bot_data ? $2
         THEN jsonb_set(bot_data, array[$2, 'joined'], 'false'::jsonb)
         ELSE bot_data
       END
     WHERE group_id = $1`, [update.id, botIdForRemove]);
                    if (!settings.bye)
                        return;
                    text = settings.sbye || `Bueno, se fue ${userTag} 👋\n\nQue dios lo bendiga 😎`;
                    isPhoto = settings.photobye;
                    title = "👋 BYE";
                    body = "Se fue del grupo";
                    if (isPhoto) {
                        ppUrl = await conn.profilePictureUrl(participantId, "image").catch(() => ppUrl);
                    }
                    break;
                case "promote":
                    groupCache.del(groupId);
                    if (!settings.detect)
                        return;
                    text = settings.spromote || `${userTag} 𝘼𝙃𝙊𝙍𝘼 𝙀𝙎 𝘼𝘿𝙈𝙄𝙉 😼🫵𝘼𝘾𝘾𝙄𝙊𝙉 𝙍𝙀𝘼𝙇𝙄𝙕𝘼𝘿𝘼 𝙋𝙊𝙍: ${authorTag}.`;
                    title = "NUEVO ADMIN 🥳";
                    body = "Ahora tiene admin";
                    break;
                case "demote":
                    groupCache.del(groupId);
                    if (!settings.detect)
                        return;
                    text = settings.sdemote || `${userTag} 𝘿𝙀𝙅𝘼 𝘿𝙀 𝙎𝙀𝙍 𝘼𝘿𝙈𝙄𝙉 😼🫵𝘼𝘾𝘾𝙄𝙊𝙉 𝙍𝙀𝘼𝙇𝙄𝙕𝘼𝘿𝘼 𝙋𝙊𝙍: ${authorTag}.`;
                    title = "📛 ADMIN REMOVIDO";
                    body = "Ya no tiene admin";
                    break;
                default:
                    continue;
            }
            text = text
                .replace(/@user/gi, userTag)
                .replace(/@group|@subject/gi, groupName)
                .replace(/@desc/gi, groupDesc)
                .replace(/@admin/gi, authorTag);
            const mentions = [participantId];
            if (author)
                mentions.push(author);
            if (text) {
                if (isPhoto) {
                    await conn.sendMessage(groupId, { image: { url: ppUrl }, caption: text,
                        contextInfo: {
                            mentionedJid: mentions,
                            isForwarded: true,
                            forwardingScore: 999999,
                            ...(isActive && {
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: jid,
                                    newsletterName: name
                                }
                            })
                        } }, { quoted: null });
                    //conn.sendMessage(groupId, { image: { url: ppUrl }, caption: text, mentions})
                }
                else {
                    await conn.sendMessage(groupId, { text: text,
                        contextInfo: {
                            mentionedJid: mentions,
                            isForwarded: true,
                            forwardingScore: 999999,
                            ...(isActive && {
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: jid,
                                    newsletterName: name
                                }
                            })
                            /*externalAdReply: {
                            mediaUrl: "api.mitzuki.xyz",
                            mediaType: 2,
                            showAdAttribution: false,
                            renderLargerThumbnail: false,
                            thumbnailUrl: ppUrl,
                            title,
                            body,
                            containsAutoReply: true,
                            sourceUrl: "https://api.mitzuki.xyz"
                            }*/
                        } }, { quoted: null });
                }
            }
        }
    }
    catch (e) {
        console.error("❌ Error en participantsUpdate:", e);
    }
}
export async function handleJoinRequest(conn, groupId, participantsRaw) {
    const myJid = (conn.user?.id || "").replace(/:\d+/, "");
    const res = await db.query(`SELECT auto_approve, antifake, antifake_prefixes, primary_bot
     FROM chats WHERE group_id = $1`, [groupId]);
    if (!res.rows[0])
        return;
    const { auto_approve, antifake, antifake_prefixes = [], primary_bot } = res.rows[0];
    if (primary_bot && primary_bot !== myJid)
        return;
    if (!auto_approve)
        return;
    for (const user of participantsRaw) {
        const jid = user.jid; // @lid
        const pn = user.pn; // @s.whatsapp.net
        const num = pn ? pn.replace(/[^0-9]/g, "") : "";
        console.log("🔍 ANTIFAKE CHECK:", { jid, num });
        if (antifake && num) {
            const blocked = antifake_prefixes.some(p => num.startsWith(p.replace("+", "")));
            if (blocked) {
                console.log("🚫 AUTO-REJECT:", num);
                await conn.groupRequestParticipantsUpdate(groupId, [jid], "reject");
                continue;
            }
        }
        console.log("✅ AUTO-APPROVE:", num || jid);
        await conn.groupRequestParticipantsUpdate(groupId, [jid], "approve");
    }
}
export async function groupsUpdate(conn, update) {
    const groupId = update.id;
    try {
        const check = await db.query("SELECT primary_bot, detect FROM chats WHERE group_id = $1", [groupId]);
        const settings_bot = check.rows[0] || {};
        const primaryBot = settings_bot.primary_bot || null;
        const myJid = (conn.user?.id || "").replace(/:\d+/, "");
        if (primaryBot &&
            primaryBot.trim() !== "" &&
            primaryBot !== myJid) {
            console.log(`🤖 ${myJid} omitió eventos "detect" en ${groupId}, bot primario es ${primaryBot}`);
            return;
        }
        const res = await db.query("SELECT * FROM chats WHERE group_id = $1", [groupId]);
        const settings = res.rowCount > 0
            ? res.rows[0]
            : {
                detect: true,
                sannounce: null,
                srestrict: null,
                ssubject: null,
                sdesc: null,
                sinvite: null
            };
        if (!settings.detect)
            return;
        const metadata = await getGroupMetadataCached(conn, groupId);
        const groupName = metadata.subject || "Grupo";
        let text = "";
        let mentions = [];
        // ==========================================
        // RESOLVER AUTOR REAL
        // ==========================================
        let authorJid = update.author || "";
        if (authorJid) {
            // Si viene como LID, buscar su número real
            if (authorJid.endsWith("@lid")) {
                const participant = metadata.participants?.find((p) => {
                    const ids = [
                        p.id,
                        p.jid,
                        p.lid,
                        p.phoneNumber
                    ]
                        .filter(Boolean)
                        .map((v) => v.replace(/:\d+/, ""));
                    return ids.includes(authorJid.replace(/:\d+/, ""));
                });
                if (participant?.phoneNumber) {
                    authorJid = participant.phoneNumber;
                }
                else {
                    console.log("⚠️ No se pudo resolver LID del autor:", update.author);
                }
            }
        }
        const authorTag = authorJid
            ? `@${authorJid.split("@")[0]}`
            : "alguien";
        if (authorJid) {
            mentions.push(authorJid);
        }
        // ==========================================
        // DETECTAR CAMBIO
        // ==========================================
        if (update.subject) {
            text =
                settings.ssubject ||
                    `El nombre del grupo ha sido cambiado a *${update.subject}* por ${authorTag}.`;
        }
        else if (update.desc) {
            text =
                settings.sdesc ||
                    `La descripción del grupo ha sido actualizada por ${authorTag}:\n\n${update.desc}`;
        }
        else if (update.announce !== undefined) {
            text =
                settings.sannounce ||
                    `El grupo ahora ${update.announce
                        ? "solo permite mensajes de admins"
                        : "permite mensajes de todos"}. Cambiado por ${authorTag}.`;
        }
        else if (update.restrict !== undefined) {
            text =
                settings.srestrict ||
                    `La edición de info del grupo ahora ${update.restrict
                        ? "está restringida a admins"
                        : "está abierta a todos"}. Cambiado por ${authorTag}.`;
        }
        else if (update.invite) {
            text =
                settings.sinvite ||
                    `El link de invitación del grupo ha sido actualizado por ${authorTag}.`;
        }
        else if (update.size !== undefined) {
            text = `El tamaño del grupo ha cambiado a ${update.size} miembros.`;
        }
        // ==========================================
        // VARIABLES PERSONALIZADAS
        // ==========================================
        if (text) {
            text = text.replace(/@admin/gi, authorTag);
            await conn.sendMessage(groupId, {
                text,
                mentions
            });
        }
    }
    catch (e) {
        console.error("❌ Error en groupsUpdate:", e);
    }
}
//expires_at memory
setInterval(async () => {
    try {
        const { rows } = await db.query(`
      SELECT 
        cm.chat_id, 
        cm.updated_at,
        CASE 
          WHEN chats.srestrict ~ '^[0-9]+$' THEN chats.srestrict::INTEGER
          ELSE 86400
        END AS memory_ttl
      FROM chat_memory cm
      JOIN chats ON cm.chat_id = chats.group_id
      WHERE 
        (chats.srestrict ~ '^[0-9]+$' AND chats.srestrict::INTEGER > 0)
        OR chats.srestrict IS NULL
    `);
        const now = Date.now();
        for (const row of rows) {
            const { chat_id, updated_at, memory_ttl } = row;
            const lastUpdated = new Date(updated_at).getTime();
            const ttl = memory_ttl * 1000;
            if (now - lastUpdated > ttl) {
                await db.query('DELETE FROM chat_memory WHERE chat_id = $1', [String(chat_id)]);
                console.log(`🧹 Memoria IA del grupo ${chat_id} eliminada automáticamente.`);
            }
        }
    }
    catch (err) {
        console.error('❌ Error limpiando memorias expiradas:', err);
    }
}, 300_000); // cada 5 minutos
async function incrementCommand(cmd) {
    if (!cmd)
        return;
    try {
        await db.query(`INSERT INTO stats (command, count)
       VALUES ($1, 1)
       ON CONFLICT (command)
       DO UPDATE SET count = stats.count + 1`, [cmd]);
    }
    catch (e) {
        console.error("❌ Error contando comando:", e);
    }
}
export async function handler(conn, m) {
    if (!m.message)
        return;
    const botId = conn.user?.id?.split(":")[0] || "unknown";
    //const botId = conn.isMainBot ? "mainbot" : `subbot:${(conn.user?.id || "").replace(/[^0-9]/g, "")}`
    const chatId = m.key.remoteJid;
    await smsg(conn, m);
    const senderNumber = (m.sender || "").replace(/[^0-9]/g, "");
    const senderLid = m.lid?.trim() ? m.lid : null;
    const senderJid = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;
    const esNumeroReal = senderJid && senderNumber.length >= 10 && senderNumber.length <= 15 && m.sender && m.sender.endsWith('@s.whatsapp.net');
    try {
        if (esNumeroReal) {
            // ✅ Tiene número real - ACTUALIZAR si existe (SIN tocar registered)
            await db.query(`
      INSERT INTO usuarios (
        id, name, num, lid, registered, limite
      )
      VALUES ($1, $2, $3, $4, false, DEFAULT)
      ON CONFLICT (lid) DO UPDATE SET
        id = EXCLUDED.id,
        name = EXCLUDED.name,
        num = EXCLUDED.num
    `, [
                senderJid,
                m.pushName || "",
                senderNumber,
                senderLid
            ]);
            console.log(`✅ Usuario guardado/actualizado: ${senderJid}`);
        }
        else if (senderLid) {
            // ✅ Solo tiene LID - INSERTAR o IGNORAR
            await db.query(`
      INSERT INTO usuarios (
        id, name, num, lid, registered, limite
      )
      VALUES ($1, $2, $3, $4, false, DEFAULT)
      ON CONFLICT (lid) DO NOTHING
    `, [
                null,
                m.pushName || "",
                null,
                senderLid
            ]);
            console.log(`✅ Usuario guardado con LID: ${senderLid}`);
        }
        else {
            console.log(`⚠️ No se guarda: sender=${m.sender}, lid=${senderLid}`);
        }
    }
    catch (e) {
        console.error("❌ Error insertando usuario:", e);
    }
    const botJid = (conn.user?.id || "").replace(/:\d+/, "");
    const botLid = conn.user?.lid || "";
    const botNumber = botJid.replace(/[^0-9]/g, "");
    const botLidNumber = botLid.replace(/[^0-9]/g, "");
    const config = await getBotSettings(botId);
    const isOwner = OWNERS.some(o => o.num === senderNumber || o.lid === m.lid) ||
        senderNumber === botNumber ||
        senderNumber === botLidNumber ||
        (config.owners || []).some((o) => o.num === senderNumber || o.lid === m.lid) ||
        !!m.key.fromMe;
    const isROwner = OWNERS.some(o => o.num === senderNumber || o.lid === m.lid);
    const isGroup = chatId.endsWith("@g.us");
    const isPrivate = !isGroup;
    try {
        // Verificar si el chat existe
        const existing = await db.query('SELECT bot_data FROM chats WHERE group_id = $1', [chatId]);
        // 🔥 Construir el objeto en JS
        const botDataObj = {
            [botId]: { joined: true }
        };
        if (existing.rows.length === 0) {
            // 🔥 Chat nuevo: crear con datos del bot
            await db.query(`
      INSERT INTO chats (group_id, is_group, bot_data)
      VALUES ($1, $2, $3::jsonb)
    `, [chatId, isGroup, JSON.stringify(botDataObj)]);
        }
        else {
            // 🔥 Chat existente: actualizar solo este bot
            let botData = existing.rows[0].bot_data || {};
            if (!botData[botId]) {
                botData[botId] = { joined: true };
            }
            else {
                botData[botId].joined = true;
            }
            await db.query(`
      UPDATE chats 
      SET is_group = $2, 
          bot_data = $3::jsonb
      WHERE group_id = $1
    `, [chatId, isGroup, JSON.stringify(botData)]);
        }
    }
    catch (e) {
        console.error("❌ Error registrando chat:", e);
    }
    //banchat global 
    try {
        const globalCheck = await db.query("SELECT banned, global_ban_exempt_groups, global_ban_exempt_users FROM bot_settings WHERE bot_id = $1 LIMIT 1", [botId]);
        const data = globalCheck.rows[0];
        const isGlobalBanned = data?.banned === true;
        if (isGlobalBanned) {
            const exemptGroups = data?.global_ban_exempt_groups || [];
            const isGroupExempt = exemptGroups.includes(chatId);
            const exemptUsers = data?.global_ban_exempt_users || [];
            const isUserExempt = exemptUsers.includes(senderJid);
            if (isGroupExempt || isUserExempt) {
            }
            else if (isOwner) {
            }
            else {
                console.log("BANCHAT GLOBAL EN BOT:", botId);
                //await conn.sendMessage(chatId, { text: `🌍 *BOT DESACTIVADO GLOBALMENTE*\n\nEste bot ha sido desactivado por el dueño.\n\n❌ No puedes usar ningún comando.` }, { quoted: m })
                return;
            }
        }
    }
    catch (e) {
        console.error("❌ Error verificando ban global:", e);
    }
    //banchat
    try {
        const banCheck = await db.query("SELECT banned FROM chats WHERE group_id = $1", [chatId]);
        const isBanned = banCheck.rows[0]?.banned === true;
        if (isBanned) {
            if (!isOwner) {
                console.log("BANCHAT GRUPO EN :", botId);
                // await conn.sendMessage(chatId, { text: `⚠️ *BOT DESACTIVADO EN ESTE GRUPO*\n\nEste grupo ha sido baneado por el dueño.\n\n> El bot no funciona aquí, dile al dueño que los active con: .banchat off` }, { quoted: m })
                return;
            }
            // Si es owner, CONTINUAR (puede usar todo)
        }
    }
    catch (e) {
        console.error("❌ Error verificando ban:", e);
    }
    //banuser
    try {
        console.log("senderJid:", senderJid);
        console.log("senderLid:", senderLid);
        console.log("senderNumber:", senderNumber);
        const userCheck = await db.query(`SELECT id, lid, banned, banned_reason, ban_warnings 
   FROM usuarios 
   WHERE id = $1 OR lid = $2 OR num = $3
   LIMIT 1`, [senderJid, senderLid, senderNumber]);
        const data = userCheck.rows[0];
        const isUserBanned = data?.banned === true;
        if (isUserBanned) {
            if (!isOwner) {
                const warnings = data?.ban_warnings || 0;
                const reason = data?.banned_reason || "Spam";
                if (warnings < 4) {
                    await conn.sendMessage(chatId, { text: `*⚠️ ESTAS BANEADO ⚠️*\n\n*• Motivo:* ${reason} (avisos: ${warnings}/3)\n\n*👉🏻 Puedes contactar al propietario del Bot si crees que se trata de un error o para charlar sobre tu desbaneo*\n\n👉 @573042648888\n👉 t.me/elrebelde21` }, { quoted: m });
                    await db.query(`
          UPDATE usuarios SET ban_warnings = ban_warnings + 1 
          WHERE id = $1 OR lid = $1 OR id = $2 OR lid = $2
        `, [senderJid, senderLid]);
                }
                return; // Siempre bloquear
            }
        }
    }
    catch (e) {
        console.error("❌ Error verificando ban de usuario:", e);
    }
    const messageContent = m.message?.ephemeralMessage?.message || m.message?.viewOnceMessage?.message || m.message;
    let text = "";
    if (messageContent?.conversation)
        text = messageContent.conversation;
    else if (messageContent?.extendedTextMessage?.text)
        text = messageContent.extendedTextMessage.text;
    else if (messageContent?.imageMessage?.caption)
        text = messageContent.imageMessage.caption;
    else if (messageContent?.videoMessage?.caption)
        text = messageContent.videoMessage.caption;
    else if (messageContent?.buttonsResponseMessage?.selectedButtonId)
        text = messageContent.buttonsResponseMessage.selectedButtonId;
    else if (messageContent?.listResponseMessage?.singleSelectReply?.selectedRowId)
        text = messageContent.listResponseMessage.singleSelectReply.selectedRowId;
    else if (messageContent?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        // Respuesta de botones modernos (interactiveMessage / nativeFlowMessage / quick_reply).
        // Esto SÍ funciona en cuentas normales de WhatsApp vía Baileys (a diferencia de
        // buttonsMessage/templateMessage, que requieren status de partner de Meta).
        try {
            const params = JSON.parse(messageContent.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            if (params?.id)
                text = params.id;
        }
        catch (e) {
            console.error("❌ Error parseando nativeFlowResponseMessage:", e);
        }
    }
    else if (messageContent?.messageContextInfo?.quotedMessage) {
        const quoted = messageContent.messageContextInfo.quotedMessage;
        text = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
    }
    else if (m.message?.conversation) {
        text = m.message.conversation;
    }
    m.originalText = typeof text === "string" ? text : "";
    text = text.trim();
    m.text = typeof text === "string" ? text.trim() : "";
    m.reply = async (text, footerText = null, mentions = []) => {
        const settings = await getBotSettings(botId);
        const jid = settings?.newsletter_jid || "120363285614743024@newsletter";
        const name = settings?.newsletter_name || "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx";
        const isActive = jid && jid !== "" && jid !== "off";
        if (!text && footerText) {
            text = '\u200B';
        }
        // ✅ Si footerText es un array, mover a mentions y poner footerText en null
        if (Array.isArray(footerText)) {
            mentions = footerText;
            footerText = null;
        }
        // ✅ Obtener menciones: de mentions o parsear del texto
        let mentionedJid = [];
        if (Array.isArray(mentions) && mentions.length) {
            mentionedJid = mentions.map(j => String(j)).filter(Boolean);
        }
        if (!mentionedJid.length) {
            const parsed = await conn.parseMention(text);
            if (Array.isArray(parsed)) {
                mentionedJid = parsed.map(j => String(j)).filter(Boolean);
            }
        }
        if (!footerText) {
            const contextInfo = {
                mentionedJid: mentionedJid,
                isForwarded: true,
                forwardingScore: 1
            };
            if (isActive) {
                contextInfo.forwardedNewsletterMessageInfo = {
                    newsletterJid: jid,
                    newsletterName: name
                };
            }
            return await conn.sendMessage(chatId, { text, contextInfo }, { quoted: m });
        }
        const quotedMsg = m;
        const msg = generateWAMessageFromContent(chatId, {
            interactiveMessage: {
                body: {
                    text: text
                },
                footer: {
                    text: footerText
                },
                header: {
                    title: '',
                    subtitle: '',
                    hasMediaAttachment: false
                },
                nativeFlowMessage: {
                    buttons: []
                },
                contextInfo: {
                    ...(isActive ? {
                        isForwarded: true,
                        forwardingScore: 1,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: jid,
                            newsletterName: name
                        }
                    } : {}),
                    mentionedJid: mentionedJid,
                    quotedMessage: quotedMsg.message,
                    stanzaId: quotedMsg.key.id,
                    participant: quotedMsg.key.participant || quotedMsg.key.remoteJid
                }
            }
        }, {});
        await conn.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });
    };
    /*m.reply = async (text = "", options = {}) => {
    const mentions = await conn.parseMention(text)
    return conn.sendMessage(m.chat, {text, mentions, ...options }, { quoted: m })
    }*/
    //self mode
    if (config.mode === "self" && !isOwner)
        return;
    //contador
    if (isGroup && senderJid && !m.key.fromMe) {
        const msgType = Object.keys(m.message || {})[0];
        const ignored = [
            "senderKeyDistributionMessage",
            "protocolMessage",
            "reactionMessage"
        ];
        if (!ignored.includes(msgType)) {
            try {
                await db.query(`
        INSERT INTO messages (group_id, user_id, message_count, last_message_at)
        VALUES ($1,$2,1,NOW())
        ON CONFLICT (group_id,user_id)
        DO UPDATE SET
          message_count = messages.message_count + 1,
          last_message_at = NOW()
      `, [chatId, senderJid]);
            }
            catch (e) {
                console.error("❌ Error contando mensajes:", e);
            }
        }
    }
    //primarybot
    if (isGroup) {
        try {
            const res = await db.query("SELECT primary_bot FROM chats WHERE group_id = $1 LIMIT 1", [chatId]);
            const primary = res.rowCount > 0 ? res.rows[0].primary_bot : null;
            const myLid = conn.user?.lid?.replace(/:\d+/, "") || ""; // LID limpio
            const myJid = conn.user?.id || "";
            if (!primary || primary === "0" || primary.trim() === "") {
                // No hay bot principal
            }
            else {
                const lowerText = (m.message?.conversation || m.text || "").toLowerCase();
                const isSetPrimaryCmd = lowerText.includes("setprimary") || lowerText.includes("setprefix");
                // 🔥 Comparar con LID o con JID
                if (!isSetPrimaryCmd && primary !== myLid && primary !== myJid) {
                    console.warn(`🤖 Este grupo tiene otro bot principal (${primary}), ignorando mensaje...`);
                    return;
                }
            }
        }
        catch (e) {
            console.error("⚠️ Error verificando bot principal:", e);
        }
    }
    const rawPrefix = (await getPrefix(botId)) || "/";
    let prefixList = [];
    const parts = rawPrefix.split(",").map(p => p.trim()).filter(p => p !== "");
    if (parts.includes("noprefix")) {
        prefixList = parts.filter(p => p !== "noprefix");
        prefixList.push(""); // Sin prefijo
    }
    else {
        prefixList = parts;
    }
    if (prefixList.length === 0) {
        prefixList = [""];
    }
    let prefijo = null;
    let body = "";
    let cmd = "";
    let args = [];
    let argText = "";
    let firstArg = "";
    let plugin = null;
    const setprefixMatch = text.match(/^(.{0,5}?)setprefix(?:\s|$)/iu);
    let handledAsSetprefix = false;
    if (setprefixMatch) {
        const p = getPlugin("setprefix");
        if (p) {
            prefijo = setprefixMatch[1];
            body = text.slice(prefijo.length).trim();
            const [cmdRaw, ...parsedArgs] = body.split(" ").filter(Boolean);
            cmd = cmdRaw?.toLowerCase() || "";
            args = parsedArgs;
            argText = args.join(" ");
            firstArg = args[0] || "";
            plugin = p;
            handledAsSetprefix = true;
        }
    }
    // ============================================================
    // 🔥 PRIMERO: DETECTAR customPrefix (SIEMPRE)
    // ============================================================
    const customPlugin = getPlugins().find(p => p.customPrefix && p.customPrefix.test(text));
    if (customPlugin) {
        // ✅ Es un comando con customPrefix (ej: >, =>, =)
        prefijo = "";
        body = text;
        // Extraer el comando (para >, =>, =, e)
        const match = text.match(/^([>=e]+)\s*/);
        if (match) {
            cmd = match[1].toLowerCase(); // ">", "=>", "=", o "e"
            argText = text.slice(match[1].length).trim();
        }
        else {
            const firstSpace = text.indexOf(' ');
            if (firstSpace !== -1) {
                cmd = text.slice(0, firstSpace).toLowerCase();
                argText = text.slice(firstSpace + 1).trim();
            }
            else {
                cmd = text.toLowerCase();
                argText = "";
            }
        }
        args = argText ? argText.split(/\s+/).filter(a => a !== "") : [];
        firstArg = args[0] || "";
        plugin = customPlugin;
        console.log('✅ [CUSTOM PREFIX] Plugin:', plugin?.name, 'cmd:', cmd, 'argText:', argText);
    }
    else {
        // ============================================================
        // 🔥 SI NO ES customPrefix, DETECTAR PREFIJO NORMAL
        // ============================================================
        const prefixMatch = handledAsSetprefix
            ? null
            : prefixList
                .filter(p => p !== "")
                .find(p => text.startsWith(p)) || null;
        if (handledAsSetprefix) {
            // ya está todo seteado arriba, no hacer nada más
        }
        else if (prefixMatch) {
            prefijo = prefixMatch;
            body = text.slice(prefijo.length).trim();
            const [cmdRaw, ...parsedArgs] = body.split(" ").filter(a => a.trim() !== "");
            const firstWhitespaceMatch = body.match(/\s/);
            const splitIndex = firstWhitespaceMatch ? firstWhitespaceMatch.index : body.length;
            argText = body.slice(splitIndex).replace(/^\s+/, "");
            cmd = cmdRaw?.toLowerCase() || "";
            args = argText ? argText.split(/\s+/).filter(a => a !== "") : [];
            firstArg = args[0] || "";
            plugin = getPlugin(cmd);
        }
        else {
            // 🔥 SIN PREFIJO (solo si está permitido)
            const allowNoPrefix = prefixList.includes("");
            if (allowNoPrefix) {
                prefijo = "";
                body = text.trim();
                const firstSpace = body.indexOf(' ');
                if (firstSpace !== -1) {
                    cmd = body.slice(0, firstSpace).toLowerCase();
                    argText = body.slice(firstSpace + 1);
                }
                else {
                    cmd = body.toLowerCase();
                    argText = "";
                }
                args = argText ? argText.split(/\s+/).filter(a => a !== "") : [];
                firstArg = args[0] || "";
                plugin = getPlugin(cmd);
            }
            else {
                plugin = null;
            }
        }
    }
    const ctx = {
        conn,
        m,
        args,
        prefijo,
        cmd,
        isOwner,
        isROwner,
        isGroup,
        isPrivate
    };
    const stop = await runBefore(m, ctx);
    if (stop)
        return;
    // ===== SET DINÁMICO PARA COMANDOS PERSONALIZADOS: .set<nombre> =====
    // Permite a owner/admin rellenar (o actualizar) el contenido de un comando
    // creado vacío con .addcmd, sin borrar lo que no se está actualizando.
    if (!plugin && prefijo && cmd && cmd.startsWith("set") && cmd.length > 3) {
        const targetRaw = cmd.slice(3).toLowerCase();
        const candidates = [targetRaw, "." + targetRaw];
        let ccRow = null;
        for (const candidate of candidates) {
            const found = await db.query(`SELECT * FROM custom_commands
       WHERE bot_id = $1 AND LOWER(cmd) = LOWER($2) AND group_id = $3
       UNION
       SELECT * FROM custom_commands
       WHERE bot_id = $1 AND LOWER(cmd) = LOWER($2) AND is_global = true
       LIMIT 1`, [botId, candidate, m.chat]);
            if (found.rows.length > 0) {
                ccRow = found.rows[0];
                break;
            }
        }
        if (ccRow) {
            // Permisos: owner siempre puede; admin solo puede sobre comandos locales de su grupo
            let allowed = isOwner;
            if (!allowed && isGroup && !ccRow.is_global) {
                try {
                    const metadata = await getGroupMetadataCached(conn, m.chat);
                    const senderCandidates = new Set([m.sender, m.key?.participant, m.key?.participantAlt, m.lid, m.sender?.split('@')[0] + '@s.whatsapp.net']
                        .filter(Boolean)
                        .map(v => String(v).replace(/:\d+/, "")));
                    allowed = metadata.participants.some((p) => {
                        const ids = [p.id, p.jid, p.lid, p.phoneNumber]
                            .filter(Boolean)
                            .map((v) => String(v).replace(/:\d+/, ""));
                        const isSameUser = ids.some(id => senderCandidates.has(id));
                        const hasAdminRole = p.admin === "admin" || p.admin === "superadmin";
                        return isSameUser && hasAdminRole;
                    });
                }
                catch (e) {
                    console.log("⚠️ Error verificando admin en set dinámico:", e.message);
                }
            }
            if (!allowed) {
                await conn.sendMessage(chatId, { text: "❌ Necesitas ser admin del grupo o owner del bot para editar este comando." }, { quoted: m });
                return;
            }
            const newText = argText?.trim() ? argText.trim() : null;
            let newUrl = null;
            let mediaChanged = false;
            const mediaTypeKeys = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio' };
            const quotedMedia = m.quoted?.message;
            let mediaSourceObj = null;
            let mediaSource = null;
            if (quotedMedia && Object.keys(mediaTypeKeys).find(k => quotedMedia[k])) {
                mediaSourceObj = quotedMedia;
                mediaSource = 'quoted';
            }
            else if (messageContent && Object.keys(mediaTypeKeys).find(k => messageContent[k])) {
                // 🔥 Media DIRECTA en el mismo mensaje, ej: mandar una imagen con el caption ".setventas hola"
                mediaSourceObj = messageContent;
                mediaSource = 'direct';
            }
            if (mediaSourceObj) {
                try {
                    const { evogb } = await import("./lib/commands.js");
                    const buffer = mediaSource === 'quoted' ? await m.quoted.download() : await m.download();
                    newUrl = await evogb(buffer);
                    mediaChanged = true;
                }
                catch (e) {
                    console.error("❌ Error subiendo media en set dinámico:", e);
                    await conn.sendMessage(chatId, { text: `❌ Error al subir media: ${e.message}` }, { quoted: m });
                    return;
                }
            }
            if (!newText && !mediaChanged) {
                await conn.sendMessage(chatId, { text: `⚠️ Uso: ${prefijo}${cmd} <texto>\nO responde a una imagen/video con ${prefijo}${cmd}` }, { quoted: m });
                return;
            }
            const setParts = [];
            const setValues = [];
            let idx = 1;
            if (newText) {
                setParts.push(`text = $${idx++}`);
                setValues.push(newText);
            }
            if (mediaChanged) {
                setParts.push(`url = $${idx++}`);
                setValues.push(newUrl);
                // Si el comando no tenía tipo de media, lo actualizamos al del archivo recibido
                const detectedMediaType = Object.entries(mediaTypeKeys)
                    .find(([k]) => mediaSourceObj[k])?.[1];
                if (detectedMediaType && ccRow.type !== detectedMediaType) {
                    setParts.push(`type = $${idx++}`);
                    setValues.push(detectedMediaType);
                }
            }
            setParts.push(`updated_at = NOW()`);
            setValues.push(ccRow.id);
            await db.query(`UPDATE custom_commands SET ${setParts.join(', ')} WHERE id = $${idx}`, setValues);
            let confirmMsg = `✅ Comando *${ccRow.cmd}* actualizado.\n`;
            if (newText)
                confirmMsg += `📝 Texto: ${newText}\n`;
            if (mediaChanged)
                confirmMsg += `🔗 Media actualizada.\n`;
            await conn.sendMessage(chatId, { text: confirmMsg }, { quoted: m });
            return;
        }
    }
    // En handler.ts, modifica la sección donde se buscan comandos personalizados:
    if (!plugin && prefijo && cmd) {
        // 🔥 CONVERTIR A MINÚSCULAS PARA COMPARAR
        const cmdLower = cmd.toLowerCase();
        const prefijoCmdLower = (prefijo + cmd).toLowerCase();
        // 1. Buscar con el prefijo actual (ej: "/ch") - comparar en minúsculas
        const withPrefix = await db.query(`SELECT * FROM custom_commands
     WHERE bot_id = $1 AND group_id = $2 AND LOWER(cmd) = LOWER($3)
     UNION
     SELECT * FROM custom_commands
     WHERE bot_id = $1 AND LOWER(cmd) = LOWER($3) AND is_global = true
     LIMIT 1`, [botId, m.chat, prefijoCmdLower]);
        if (withPrefix.rows.length > 0) {
            const cc = withPrefix.rows[0];
            return executeCustomCommand(conn, m, cc);
        }
        // 2. Buscar sin prefijo (ej: "ch")
        const withoutPrefix = await db.query(`SELECT * FROM custom_commands
     WHERE bot_id = $1 AND group_id = $2 AND LOWER(cmd) = LOWER($3)
     UNION
     SELECT * FROM custom_commands
     WHERE bot_id = $1 AND LOWER(cmd) = LOWER($3) AND is_global = true
     LIMIT 1`, [botId, m.chat, cmdLower]);
        if (withoutPrefix.rows.length > 0) {
            const cc = withoutPrefix.rows[0];
            return executeCustomCommand(conn, m, cc);
        }
        // 3. Buscar comandos que empiecen con "." + cmd
        const anyPrefix = await db.query(`SELECT * FROM custom_commands
     WHERE bot_id = $1 AND group_id = $2 AND LOWER(cmd) = LOWER($3)
     UNION
     SELECT * FROM custom_commands
     WHERE bot_id = $1 AND LOWER(cmd) = LOWER($3) AND is_global = true
     LIMIT 1`, [botId, m.chat, '.' + cmdLower]);
        if (anyPrefix.rows.length > 0) {
            const cc = anyPrefix.rows[0];
            return executeCustomCommand(conn, m, cc);
        }
    }
    // 4. Para comandos SIN PREFIJO
    if (!plugin && !prefijo) {
        const custom = await db.query(`SELECT * FROM custom_commands
     WHERE bot_id = $1 AND group_id = $2 AND LOWER(cmd) = LOWER($3)
     UNION
     SELECT * FROM custom_commands
     WHERE bot_id = $1 AND LOWER(cmd) = LOWER($3) AND is_global = true
     LIMIT 1`, [botId, m.chat, text.trim().toLowerCase()]);
        if (custom.rows.length > 0) {
            const cc = custom.rows[0];
            return executeCustomCommand(conn, m, cc);
        }
    }
    // Función para ejecutar el comando personalizado - HACERLA ASYNC
    async function executeCustomCommand(conn, m, cc) {
        // Si es un sticker y tiene texto que empieza con ".", ejecutar el comando
        if (cc.type === 'sticker' && cc.text && cc.text.startsWith('.')) {
            const cmdName = cc.text.slice(1).toLowerCase();
            const plugin = getPlugin(cmdName);
            if (plugin) {
                let participants = [];
                try {
                    const meta = await conn.groupMetadata(m.chat);
                    participants = meta.participants;
                }
                catch (e) { }
                // 🔥 El permiso ya se otorgó cuando el admin/owner CREÓ el comando
                return plugin.run({
                    conn,
                    m,
                    text: "",
                    args: [],
                    firstArg: "",
                    body: cc.text,
                    prefijo: ".",
                    cmd: cmdName,
                    isAdmin: true,
                    isGroup: m.isGroup || false,
                    isOwner: true,
                    isROwner: true,
                    participants
                });
            }
        }
        const defaultText = `⚠️ El comando *${cc.cmd}* todavía no tiene contenido configurado.\n\n> Usar: .set${body} para configurar (solo admin o owner)`;
        switch (cc.type) {
            case 'text':
                return conn.sendMessage(m.chat, { text: cc.text || defaultText }, { quoted: m });
            case 'image':
                if (cc.url) {
                    return conn.sendMessage(m.chat, {
                        image: { url: cc.url },
                        caption: cc.text || ""
                    }, { quoted: m });
                }
                break;
            case 'video':
                if (cc.url) {
                    return conn.sendMessage(m.chat, {
                        video: { url: cc.url },
                        caption: cc.text || ""
                    }, { quoted: m });
                }
                break;
            case 'audio':
                if (cc.url) {
                    return conn.sendMessage(m.chat, {
                        audio: { url: cc.url },
                        mimetype: "audio/mpeg",
                        ptt: true
                    }, { quoted: m });
                }
                break;
            case 'sticker':
                if (cc.url) {
                    return conn.sendMessage(m.chat, {
                        sticker: { url: cc.url }
                    }, { quoted: m });
                }
                break;
        }
        return conn.sendMessage(m.chat, { text: cc.text || defaultText }, { quoted: m });
    }
    // Detección de stickers
    if (m.message?.stickerMessage) {
        try {
            const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
            let mediaBuffer = null;
            try {
                mediaBuffer = await downloadMediaMessage(m, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: conn.updateMediaMessage
                });
            }
            catch (downloadErr) {
                // 🔥 Reintento: a veces Baileys falla la primera vez si no tiene la
                // sesión de cifrado del remitente todavía. Forzamos un reupload y
                // reintentamos una vez más antes de rendirnos.
                console.log("⚠️ Falló la 1ra descarga del sticker, reintentando:", downloadErr.message);
                try {
                    await conn.updateMediaMessage(m);
                    mediaBuffer = await downloadMediaMessage(m, 'buffer', {}, { logger: console, reuploadRequest: conn.updateMediaMessage });
                }
                catch (retryErr) {
                    console.error("❌ Falló también el reintento de descarga del sticker:", retryErr.message);
                }
            }
            if (mediaBuffer) {
                const hash = await computeStickerHash(mediaBuffer);
                const res = await db.query(`SELECT * FROM custom_commands 
         WHERE bot_id = $1 AND sticker_hash = $2
         AND (group_id = $3 OR is_global = true)
         LIMIT 1`, [botId, hash, chatId]);
                if (res.rows.length > 0) {
                    const cc = res.rows[0];
                    // Asegurar que m.isGroup esté definido
                    if (!m.isGroup) {
                        m.isGroup = chatId.endsWith("@g.us");
                    }
                    return await executeCustomCommand(conn, m, cc);
                }
                else {
                    console.log("ℹ️ Sticker recibido pero sin hash coincidente en custom_commands (bot_id:", botId, ")");
                }
            }
            else {
                console.error("❌ No se pudo descargar el sticker (buffer vacío) - remitente:", m.sender);
            }
        }
        catch (e) {
            console.error('❌ Error detectando sticker:', e);
        }
    }
    if (!plugin && prefijo) {
        const allCmds = getPlugins().flatMap(p => Array.isArray(p.command) ? p.command : [p.name])
            .filter(Boolean)
            .map(c => c.toString().toLowerCase());
        function similar(a, b) {
            const longer = a.length > b.length ? a : b;
            const shorter = a.length > b.length ? b : a;
            const longerLength = longer.length;
            if (longerLength === 0)
                return 1.0;
            const same = longerLength - longer.split(shorter).join("").length;
            return same / longerLength;
        }
        let bestMatch = "";
        let bestScore = 0;
        for (const c of allCmds) {
            const score = similar(cmd, c);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = c;
            }
        }
        if (!m._invalidWarned) {
            m._invalidWarned = true;
            let msg = `${m.e.warn} *El comando \`${prefijo + cmd}\` no existe.*\n\n`;
            if (bestScore > 0.35)
                msg += `💡 Quizás quisiste decir: *${prefijo}${bestMatch}*\n\n`;
            msg += `> Usa *${prefijo}help* para ver los comandos disponibles.`;
            //await m.reply(msg)
            //conn.sendMessage(m.chat, { text: msg }, { quoted: m })
        }
        return;
    }
    if (!plugin)
        return;
    try {
        const user = m.pushName || senderNumber;
        let chatType = isGroup ? "Grupo" : "Privado";
        let chatName = chatType;
        if (isGroup) {
            try {
                const metadata = await getGroupMetadataCached(conn, chatId);
                chatName = metadata.subject || "Grupo sin nombre";
            }
            catch {
                chatName = "Grupo";
            }
        }
        logCommand({
            conn,
            sender: user,
            chatId: m.chat,
            isGroup: m.isGroup,
            command: prefijo + (cmd || "")
        });
        await incrementCommand(cmd);
        if (plugin.owner && !isOwner)
            return m.reply(null, m.e.warn + ` ${m.msg.owner}`);
        if (plugin.rowner && !isROwner)
            return m.reply(null, m.e.warn + ` Este comando solo puede ser usando por mi owner principal`);
        if (plugin.group && !isGroup)
            return m.reply(null, m.e.warn + ` ${m.msg.group}`);
        if (plugin.private && !isPrivate)
            return m.reply(null, m.e.warn + ` ${m.msg.private}`);
        let metadata = null;
        let isAdmin = false;
        if (chatId.endsWith("@g.us")) {
            try {
                metadata = await getGroupMetadataCached(conn, chatId);
                const senderCandidates = new Set([
                    m.sender,
                    m.key?.participant,
                    m.key?.participantAlt,
                    m.lid,
                    `${senderNumber}@s.whatsapp.net`,
                    `${senderNumber}@lid`
                ]
                    .filter(Boolean)
                    .map(v => String(v).replace(/:\d+/, "")));
                isAdmin = metadata.participants.some(p => {
                    const ids = [
                        p.id,
                        p.jid,
                        p.lid,
                        p.phoneNumber
                    ]
                        .filter(Boolean)
                        .map(v => String(v).replace(/:\d+/, ""));
                    const isSameUser = ids.some(id => senderCandidates.has(id));
                    const hasAdminRole = p.admin === "admin" || p.admin === "superadmin";
                    return isSameUser && hasAdminRole;
                });
            }
            catch (e) {
                console.log("⚠️ No se pudo obtener metadata del grupo:", e.message);
            }
        }
        if (plugin.admin && !isAdmin)
            return m.reply(null, m.e.warn + ` ${m.msg.admin}`);
        if (plugin.premium && !isOwner) {
            const res = await db.query(`SELECT premium, premium_until FROM usuarios 
     WHERE id = $1 OR lid = $2
     LIMIT 1`, [senderJid, senderLid]);
            if (res.rowCount === 0)
                return m.reply(null, `⚠️ Este comando solo puede usado por usuarios premium o mi owner`);
            const user = res.rows[0];
            const until = Number(user?.premium_until) || 0;
            const active = !!user?.premium && until > Date.now();
            if (!active) {
                await db.query(`UPDATE usuarios SET premium = false 
       WHERE id = $1 OR lid = $2`, [senderJid, senderLid]);
                return m.reply(null, `⚠️ Este comando solo puede usado por usuarios premium o mi owner`);
            }
        }
        
if (plugin.tags?.includes('nsfw') && m.isGroup) {
  const { rows } = await db.query('SELECT modohorny, nsfw_horario FROM chats WHERE group_id = $1', [chatId])
  const { modohorny = false, nsfw_horario = '00:00-07:00' } = rows[0] || {}

  const nowBA = (await import('moment-timezone')).default().tz('America/Argentina/Buenos_Aires')
  const hhmm = nowBA.format('HH:mm')
  const [ini = '00:00', fin = '07:00'] = (nsfw_horario || '00:00-07:00').split('-')
  const dentro = ini <= fin ? (hhmm >= ini && hhmm <= fin) : (hhmm >= ini || hhmm <= fin)

  if (!modohorny || !dentro) {
    const stickerUrls = ['https://qu.ax/bXMB.webp', 'https://qu.ax/TxtQ.webp']
    const ppUrl = await fetch("https://telegra.ph/file/39fb047cdf23c790e0146.jpg")
    const img = Buffer.from(await ppUrl.arrayBuffer())
    
      await conn.reply(m.chat, modohorny ? `🔞 NSFW fuera del horario permitido (${ini} a ${fin})` : '🔞 El NSFW está desactivado por un admin.\n\n> Usa *#enable modohorny* para activarlo.', m, {
        thumbnail: img,
        title: "NSFW Desactivado",
        description: modohorny ? `Horario permitido: ${ini} a ${fin}` : '#enable modohorny',
        largeThumbnail: false,
        previewType: "video", 
        thumbnailUrl: "https://api.mitzuki.xyz"
      })
    return;
  }
}
        
        //modeadmin
        if (isGroup) {
            try {
                const result = await db.query("SELECT modoadmin FROM chats WHERE group_id = $1 LIMIT 1", [chatId]);
                const modoadmin = result.rows[0]?.modoadmin || false;
                if (modoadmin && !isAdmin && !isOwner) {
                    console.log(`🚫 Modo admin activo en ${chatId}, ignorando mensaje de no admin...`);
                    return;
                }
            }
            catch (e) {
                console.error("⚠️ Error verificando modoadmin:", e);
            }
        }
        if (plugin.register) {
            // Verificar si el registro está activado para este bot
            const configReg = await db.query("SELECT registro FROM bot_settings WHERE bot_id = $1", [botId]);
            const registroActivado = configReg.rows[0]?.registro !== undefined ? configReg.rows[0].registro : true;
            if (registroActivado) {
                const res = await db.query(`SELECT 1 FROM usuarios 
         WHERE (id = $1 AND registered = true) 
            OR (lid = $2 AND registered = true)
         LIMIT 1`, [senderJid, senderLid]);
                if (res.rowCount === 0) {
                    return m.reply(`「NO ESTAS REGISTRADO」`, `PA NO APARECES EN MI BASE DE DATOS ✋🥸🤚\n\nPara poder usarme escribe el siguente comando\n\nComando: ${prefijo}reg nombre.edad\nEjemplo: ${prefijo}reg elrebelde.21`);
                }
            }
        }
        
if (plugin.limit) {
const res = await db.query('SELECT limite FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1', [m.sender, m.lid || ""])
  const limite = res.rows[0]?.limite ?? 0

if (limite < plugin.limit) {
await m.reply(null, `*⚠ Sus ${m.e.currency_name} ${m.e.currency_emoji} se han agotado puede comprar mas usando el comando:* #buy.`);
return;
}
            //await db.query('UPDATE usuarios SET limite = limite - $1 WHERE id = $2', [plugin.limit, m.sender]);
            //await m.reply(null, `*${plugin.limit} diamante 💎 usado${plugin.limit > 1 ? 's' : ''}.*`);
        }
        
        if (plugin.money) {
            try {
                const res = await db.query('SELECT money FROM usuarios WHERE id = $1 OR lid = $1', [m.sender]);
                const money = res.rows[0]?.money ?? 0;
                if (money < plugin.money) {
                    return m.reply(null, "*NO TIENE SUFICIENTES COINS 🪙*");
                }
                await db.query('UPDATE usuarios SET money = money - $1 WHERE id = $2 OR lid = $2', [plugin.money, m.sender]);
                await m.reply(null, `*${plugin.money} Coins usado${plugin.money > 1 ? 's' : ''} 🪙*`);
            }
            catch (err) {
                console.error(err);
            }
        }
        if (plugin.level) {
            try {
                const result = await db.query('SELECT level FROM usuarios WHERE id = $1 OR lid = $1', [m.sender]);
                const nivel = result.rows[0]?.level ?? 0;
                if (nivel < plugin.level) {
                    return m.reply(null, `*⚠️ 𝐍𝐞𝐜𝐞𝐬𝐢𝐭𝐚 𝐞𝐥 𝐧𝐢𝐯𝐞𝐥 ${plugin.level}, 𝐩𝐚𝐫𝐚 𝐩𝐨𝐝𝐞𝐫 𝐮𝐬𝐚𝐫 𝐞𝐬𝐭𝐞 𝐜𝐨𝐦𝐚𝐧𝐝𝐨, 𝐓𝐮 𝐧𝐢𝐯𝐞𝐥 𝐚𝐜𝐭𝐮𝐚𝐥 𝐞𝐬:* ${nivel}`);
                }
            }
            catch (err) {
                console.error(err);
            }
        }
        if (plugin.limitPrem) {
            const tipo = config.tipo || "subbot";
            if (tipo === "subbot") {
                m.validarPeso = async (url) => {
                    try {
                        const res = await fetch(url, { method: "HEAD" });
                        const size = parseInt(res.headers.get("content-length") || "0");
                        const sizeMB = size / (1024 * 1024);
                        if (sizeMB > 15) {
                            await m.reply(null, m.e.warn + " Límite de descarga 15 MB para *subbots FREE*.\n👉 Pásate a *Premium* para más descargar archivos mas grandes.");
                            return false;
                        }
                        return true;
                    }
                    catch {
                        await m.reply(null, m.e.warn + " No pude verificar el tamaño del archivo.");
                        return false;
                    }
                };
            }
            else {
                m.validarPeso = async () => true;
            }
        }
        await plugin.run({
            conn,
            m,
            text: argText,
            args,
            firstArg,
            body,
            prefijo,
            cmd,
            isAdmin,
            isGroup,
            isOwner,
            isROwner
        });
        
if (m.success && plugin.limit && !isOwner && !plugin.premium) {
  await db.query(`UPDATE usuarios SET limite = limite - $1 WHERE id = $2 OR lid = $2`, [plugin.limit, m.sender]);
await m.reply(null, `${plugin.limit} ${m.e.currency_name} ${m.e.currency_emoji} usado${plugin.limit > 1 ? 's' : ''}.`);  
}
        
        await runAfter(m, ctx);
    }
    catch (err) {
        console.error(`❌ Error en comando ${cmd}:`, err);
        await conn.sendMessage(chatId, { text: `${m.e.warn + m.msg.error}\n\n >>> ${err} <<<<` }, { quoted: m });
    }
}
// Verificar grupos expirados - SOLO para este bot
export function verificarExpirados(conn) {
    const botId = conn.user?.id?.split(":")[0] || "unknown";
    const botJid = conn.user?.jid || `${botId}@s.whatsapp.net`;
    const botJidClean = botJid.replace(/:\d+/, "");
    const botLid = conn.user?.lid || "";
    const botLidClean = botLid.replace(/:\d+/, "").split("@")[0] || "";
    const revisar = async () => {
        try {
            const now = Date.now();
            // 🔥 1. VERIFICAR GRUPOS EXPIRADOS
            const { rows: expirados } = await db.query(`SELECT group_id, bot_data
         FROM chats
         WHERE bot_data ? $1
         AND (bot_data->$1->>'expired')::bigint > 0
         AND (bot_data->$1->>'expired')::bigint <= $2`, [botId, now]);
            if (expirados.length > 0) {
                console.log(`⏰ [VERIFICADOR] Grupos expirados (${botId}): ${expirados.length}`);
                for (const row of expirados) {
                    const groupId = row.group_id;
                    let metadata;
                    try {
                        metadata = await conn.groupMetadata(groupId);
                        const isParticipant = metadata.participants.some(p => {
                            const ids = [
                                p.id, p.phoneNumber, p.lid,
                                p.id?.replace(/:\d+/, ""),
                                p.phoneNumber?.replace(/:\d+/, ""),
                                p.phoneNumber?.split("@")[0],
                                p.id?.split("@")[0],
                                p.phoneNumber?.split(":")[0],
                            ].filter(Boolean);
                            const found = ids.includes(botId) || ids.includes(botJid) || ids.includes(botJidClean) || ids.includes(botLidClean) || ids.includes(botLid);
                            if (found)
                                console.log(`✅ [VERIFICADOR] Bot encontrado: ${p.phoneNumber || p.id}`);
                            return found;
                        });
                        if (!isParticipant) {
                            await db.query(`UPDATE chats SET bot_data = bot_data - $1 WHERE group_id = $2`, [botId, groupId]);
                            continue;
                        }
                        console.log(`✅ [VERIFICADOR] Bot ${botId} SÍ está en ${groupId}, procesando salida...`);
                    }
                    catch (e) {
                        console.log(`⚠️ [VERIFICADOR] Error metadata ${groupId}, removiendo...`);
                        await db.query(`UPDATE chats SET bot_data = bot_data - $1 WHERE group_id = $2`, [botId, groupId]);
                        continue;
                    }
                    const groupName = metadata?.subject || "este grupo";
                    let groupImageBuffer = null;
                    try {
                        const imageUrl = await conn.profilePictureUrl(groupId, "image");
                        const response = await fetch(imageUrl);
                        const arrayBuffer = await response.arrayBuffer();
                        groupImageBuffer = Buffer.from(arrayBuffer);
                    }
                    catch { }
                    const fkontak = { key: {
                            fromMe: false,
                            participant: "0@s.whatsapp.net",
                            remoteJid: "status@broadcast"
                        },
                        message: {
                            contactMessage: {
                                displayName: groupName,
                                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${groupName};;;\nFN:${groupName}\nTEL;type=CELL;type=VOICE;waid=0:0\nEND:VCARD`,
                                jpegThumbnail: groupImageBuffer
                            }
                        } };
                    try {
                        await conn.sendMessage(groupId, { text: [`*${conn.user.name}*, se acabó mi tiempo 😔\n\n> Si quieren que vuelva, usen .join`, `Bye 😘`, `*${conn.user.name}*, me voy de este grupito 🤣\n\n> Si quieren que vuelva usen .join`].getRandom() }, { quoted: fkontak });
                    }
                    catch (e) {
                        console.log(`⚠️ [EXPIRADO] No se pudo enviar mensaje a ${groupId}:`, e.message);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    try {
                        await conn.groupLeave(groupId);
                        await db.query(`UPDATE chats SET bot_data = bot_data - $1 WHERE group_id = $2`, [botId, groupId]);
                        console.log(`🧹 [EXPIRADO] Datos de ${botId} removidos de ${groupId}`);
                    }
                    catch (leaveError) {
                        console.error(`❌ [EXPIRADO] Error al salir de ${groupId}:`, leaveError.message);
                        const errorText = String(leaveError?.message || leaveError).toLowerCase();
                        if (errorText.includes("forbidden") || errorText.includes("not-authorized") || errorText.includes("not in group") || errorText.includes("not a participant")) {
                            await db.query(`UPDATE chats SET bot_data = bot_data - $1 WHERE group_id = $2`, [botId, groupId]);
                            console.log(`🧹 [EXPIRADO] Datos de ${botId} removidos de ${groupId} (no estaba en el grupo)`);
                        }
                    }
                }
            }
            // 🔥 2. VERIFICAR GRUPOS PENDIENTES (aprobación de admin)
            const { rows: pendientes } = await db.query(`SELECT group_id, bot_data 
         FROM chats 
         WHERE bot_data ? $1 
         AND (bot_data->$1->>'pending')::boolean = true`, [botId]);
            if (pendientes.length > 0) {
                console.log(`⏳ [VERIFICADOR] Grupos pendientes (${botId}): ${pendientes.length}`);
                for (const row of pendientes) {
                    const groupId = row.group_id;
                    const botData = row.bot_data[botId];
                    try {
                        const metadata = await conn.groupMetadata(groupId);
                        const myJid = conn.user?.id?.replace(/:\d+/, "");
                        const myLid = conn.user?.lid || "";
                        const soyMiembro = metadata.participants.some(p => {
                            const ids = [
                                p.id,
                                p.phoneNumber,
                                p.lid
                            ].filter(Boolean).map(v => String(v).replace(/:\d+/, ""));
                            return ids.includes(botId) ||
                                ids.includes(myJid) ||
                                ids.includes(myLid) ||
                                ids.includes(botId + "@s.whatsapp.net");
                        });
                        if (soyMiembro) {
                            console.log(`✅ [VERIFICADOR] Bot aceptado en ${groupId}`);
                            const { tieneTiempo, timeInMs, time, unit, solicitante, esOwnerDirecto } = botData;
                            const expiresAt = tieneTiempo && timeInMs > 0 ? Date.now() + timeInMs : 0;
                            const nuevoBotData = { joined: true, expired: expiresAt, pending: false };
                            await db.query(`UPDATE chats SET bot_data = bot_data || $2::jsonb WHERE group_id = $1`, [groupId, JSON.stringify({ [botId]: nuevoBotData })]);
                            let mes;
                            if (esOwnerDirecto) {
                                mes = `Hola a todos 👋🏻\n\nSoy *${conn.user?.name || "Mitzuki"}*.\nMe uní por orden del dueño.${tieneTiempo ? `\n\nEl bot saldrá automáticamente después de:\n${time} ${unit}${time > 1 ? "s" : ""}` : ""}`; //`
                            }
                            else if (tieneTiempo && timeInMs > 0) {
                                mes = `Hola a todos 👋🏻\n\nSoy *${conn.user?.name || "Mitzuki"}*.\nFui invitado por *@${solicitante}*\n\nEl bot saldrá automáticamente después de:\n${time} ${unit}${time > 1 ? "s" : ""}`;
                            }
                            else {
                                mes = `Hola a todos 👋🏻\n\nSoy *${conn.user?.name || "Mitzuki"}*.\nFui invitado por *@${solicitante}*`;
                            }
                            await conn.sendMessage(groupId, { text: mes, contextInfo: { mentionedJid: solicitante ? [`${solicitante}@s.whatsapp.net`] : [] } });
                            console.log(`✅ [VERIFICADOR] Mensaje enviado a ${groupId}`);
                        }
                    }
                    catch (e) {
                        // Grupo no accesible, ignorar
                    }
                }
            }
        }
        catch (e) {
            console.error("❌ [VERIFICADOR] Error general:", e?.message || e);
        }
    };
    setInterval(revisar, 30_000);
}
