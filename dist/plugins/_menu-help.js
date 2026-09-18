import moment from "moment-timezone";
import { getPlugins } from "../lib/plugins.js";
import { getBotSettings, db } from "../lib/db.js";
import fetch from "node-fetch";
const tags = {
    main: "ℹ️ INFOBOT",
    jadibot: "✨ SER SUB BOT",
    grupo: "👥 GRUPOS",
    game: '🎮 GAME',
    gacha: '✨️ RPG GACHA',
    rg: '🟢 REGISTRO',
    econ: '🛠 RPG',
    downloader: "🚀 DESCARGAS",
    buscadores: '🔍 BUSCADORES',
    convertidor: '🎈 CONVERTIDORES',
    tools: '🔧 HERRAMIENTA',
    nable: '🕹 ENABLE/DISABLE',
    sticker: '🧧 STICKER',
    ventas: '🛍️ VENTAS',
    freefire: '🪎 FREE FIRE',
    randow: '🪄 RANDOW',
    owner: '👑 OWNER'
};
const tagNames = {
    main: "main",
    jadibot: "jadibot",
    grupo: "grupo",
    gacha: "gacha",
    rg: "rg",
    econ: "econ",
    downloader: "downloader",
    buscadores: "buscadores",
    convertidor: "convertidor",
    tools: "tools",
    nable: "nable",
    sticker: "sticker",
    ventas: 'ventas',
    freefire: 'freefire',
    owner: "owner",
    randow: "randow",
    game: "game"
};
const defaultMenu = {
    before: `*Hola %tag 👋🏻*, como estas? soy %wm

*• Owner:* @edi
*• Fecha:* %fecha
*• Hora:* %hora (🇭🇳)
*• Tiempo activos:* %muptime
*• Tu limite:* %limit
*• Usuario registrados:* %toUserReg de %toUsers

`.trimStart(),
    header: "\n" + "`<[ %category ]>`" + "\n",
    body: "%cmd _(%desc)_\n",
    footer: "\n",
    after: ""
};
// Función para agrupar comandos con la misma descripción RESPETANDO EL ORDEN
function groupCommandsByDesc(items) {
    const groups = [];
    const descMap = {};
    for (const item of items) {
        const key = item.desc || "Sin descripción";
        if (descMap[key] !== undefined) {
            groups[descMap[key]].cmds.push(item.cmd);
        }
        else {
            descMap[key] = groups.length;
            groups.push({ cmds: [item.cmd], desc: key });
        }
    }
    return groups;
}
export default {
    name: ["menu", "help", "memu", "comandos", "menú"],
    help: ["menu", "help"],
    desc: "Muestra todos los comandos por categoría",
    tags: ["main"],
    run: async ({ conn, m, body, prefijo }) => {
        const nombre = m.pushName || (m.sender || "").split("@")[0];
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        const settings = await getBotSettings(botId);
        const jid = settings?.newsletter_jid || "120363285614743024@newsletter";
        const name = settings?.newsletter_name || "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx";
        const isActive = jid && jid !== "" && jid !== "off";
        const totalPlugins = getPlugins().filter(p => p?.tags).length;
        const menuType = settings?.menu_type || "image";
        const menuMedia = settings?.menu_media || "";
        const menuText = settings?.menu_text || "";
        const { name_bot, tipo, logo_url } = settings;
        const fecha = moment.tz("America/Tegucigalpa").format("DD/MM/YYYY");
        const hora = moment.tz("America/Tegucigalpa").format("HH:mm:ss");
        const muptime = (() => {
            const uptime = process.uptime() * 1000;
            const h = Math.floor(uptime / 3600000);
            const m_ = Math.floor((uptime % 3600000) / 60000);
            const s = Math.floor((uptime % 60000) / 1000);
            return `${h}h ${m_}m ${s}s`;
        })();
        let user;
        try {
            const userRes = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [m.sender]);
            user = userRes.rows[0] || { limite: 0, level: 0, exp: 0, role: '-' };
        }
        catch (err) {
            user = { limite: 0, level: 0, exp: 0, role: '-' };
        }
        const reg = await db.query(`SELECT COUNT(*)::int AS total FROM usuarios WHERE registered = true`);
        const all = await db.query(`SELECT COUNT(*)::int AS total FROM usuarios`);
        const toUserReg = reg.rows[0]?.total || 0;
        const toUsers = all.rows[0]?.total || 0;
        const ppUrl = await fetch("https://telegra.ph/file/39fb047cdf23c790e0146.jpg");
        const img = Buffer.from(await ppUrl.arrayBuffer());
        const botOwnerJid = conn.user?.id?.split(":")[0] || "";
        const botNumber = botOwnerJid.replace(/[^0-9]/g, "");
        const botOfc = tipo === "main" ? "*• Este es el bot oficial.*" : `*• Soy un sub bot de:* wa.me/${botNumber}`;
        const owner = "edi";
        const metadata = await conn.groupMetadata(m.chat);
        const groupName = metadata?.subject || "Bot";
        const arg = (body.split(" ")[1] || "").toLowerCase();
        const grouped = {};
        const allPlugins = getPlugins();
        const unique = new Map();
        for (const p of allPlugins) {
            const key = Array.isArray(p.name) ? p.name.map(n => String(n).toLowerCase()).sort().join("|") : String(p.name).toLowerCase();
            if (!unique.has(key))
                unique.set(key, p);
        }
        for (const pl of unique.values()) {
            const tagList = Array.isArray(pl.tags) && pl.tags.length ? pl.tags : ["otros"];
            const names = Array.isArray(pl.help) && pl.help.length
                ? pl.help
                : Array.isArray(pl.name)
                    ? pl.name
                    : [String(pl.name || "")];
            const desc = pl.desc || "Sin descripción";
            for (const tag of tagList) {
                if (!tags[tag])
                    continue;
                if (arg && tag !== arg)
                    continue;
                if (!grouped[tag])
                    grouped[tag] = [];
                for (const name of names) {
                    grouped[tag].push({
                        cmd: `${prefijo}${name}`,
                        desc: desc
                    });
                }
            }
        }
        if (arg && !grouped[arg])
            return m.reply(`${m.e.warn} No hay comandos en la categoría *${arg}*`);
        // Variables base - CORREGIDO
        const variables = {
            name: nombre || "",
            tag: `@${m.sender?.split("@")[0] || ""}`,
            fecha: fecha || "",
            hora: hora || "",
            wm: name_bot || "Mitzuki",
            muptime: muptime || "0h 0m 0s",
            limit: String(user.limite || 0),
            botOfc: botOfc || "",
            toUserReg: String(toUserReg || 0),
            toUsers: String(toUsers || 0),
            plugin: String(totalPlugins || 0),
            group: groupName || "bot",
            prefix: prefijo || "/"
        };
        function replaceVars(text) {
            return text
                .replace(/%name/gi, variables.name)
                .replace(/%tag/gi, variables.tag)
                .replace(/%fecha/gi, variables.fecha)
                .replace(/%hora/gi, variables.hora)
                .replace(/%wm/gi, variables.wm)
                .replace(/%muptime/gi, variables.muptime)
                .replace(/%limit/gi, variables.limit)
                .replace(/%botOfc/gi, variables.botOfc)
                .replace(/%toUserReg/gi, variables.toUserReg)
                .replace(/%toUsers/gi, variables.toUsers)
                .replace(/%plugin/gi, variables.plugin)
                .replace(/%group/gi, variables.group)
                .replace(/%prefix/gi, variables.prefix);
        }
        // Función para generar TODOS los comandos CON categorías con AGRUPACIÓN por descripción
        function generateAllCommandsWithCategories() {
            let result = "";
            const orderedTags = Object.keys(tags);
            let first = true;
            for (const tag of orderedTags) {
                if (!grouped[tag])
                    continue;
                if (!first) {
                    result += "\n";
                }
                first = false;
                result += "`<[ " + (tags[tag] || tag.toUpperCase()) + " ]>`" + "\n";
                // Agrupar comandos por descripción
                const groups = groupCommandsByDesc(grouped[tag]);
                for (const group of groups) {
                    if (group.cmds.length > 1) {
                        for (const cmd of group.cmds) {
                            result += "✦ " + cmd + "\n";
                        }
                        result += "   ↳ " + group.desc + "\n";
                    }
                    else {
                        result += "✦ " + group.cmds[0] + "\n";
                        result += "   ↳ " + group.desc + "\n";
                    }
                }
            }
            return result;
        }
        let finalText = "";
        if (menuText) {
            let text = replaceVars(menuText);
            const categoryKeys = Object.keys(tagNames);
            // Procesar categorías personalizadas
            for (const key of categoryKeys) {
                const placeholder = `%${tagNames[key]}`;
                const placeholderRegex = new RegExp(placeholder, "gi");
                const tagDisplayName = tags[key] || key.toUpperCase();
                if (text.includes(placeholder)) {
                    const lines = text.split("\n");
                    const newLines = [];
                    const tag = tagNames[key];
                    const items = (tag && grouped[tag]) ? grouped[tag] : [];
                    // Buscar índice de la línea con el placeholder y desc
                    let placeholderIndex = -1;
                    let descIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes(placeholder)) {
                            placeholderIndex = i;
                        }
                        if (lines[i].includes("%desc") && placeholderIndex !== -1 && i > placeholderIndex) {
                            descIndex = i;
                            break;
                        }
                    }
                    // Si encontramos placeholder y desc en líneas separadas
                    if (placeholderIndex !== -1 && descIndex !== -1) {
                        const cmdLine = lines[placeholderIndex];
                        const descLine = lines[descIndex];
                        for (let i = 0; i < lines.length; i++) {
                            if (i === placeholderIndex) {
                                if (items.length === 0)
                                    continue;
                                for (const item of items) {
                                    // Línea del comando SOLO (sin mezclar con descripción)
                                    const rendered = cmdLine
                                        .replace(placeholderRegex, item.cmd)
                                        .replace(/%desc/gi, "");
                                    newLines.push(rendered);
                                    // Línea de la descripción (separada, con su indentación)
                                    const renderedDesc = descLine
                                        .replace(/%desc/gi, item.desc)
                                        .replace(/%cmd/gi, "");
                                    newLines.push(renderedDesc);
                                }
                            }
                            else if (i === descIndex) {
                                continue;
                            }
                            else {
                                newLines.push(lines[i]);
                            }
                        }
                        text = newLines.join("\n");
                    }
                    else if (placeholderIndex !== -1) {
                        // Solo placeholder sin desc (o en la misma línea)
                        for (const line of lines) {
                            if (line.includes(placeholder) && !line.includes("%desc")) {
                                if (items.length === 0)
                                    continue;
                                for (const item of items) {
                                    const rendered = line
                                        .replace(placeholderRegex, item.cmd)
                                        .replace(/%desc/gi, "");
                                    newLines.push(rendered);
                                }
                            }
                            else if (line.includes(placeholder) && line.includes("%desc")) {
                                if (items.length === 0)
                                    continue;
                                for (const item of items) {
                                    const rendered = line
                                        .replace(placeholderRegex, item.cmd)
                                        .replace(/%desc/gi, item.desc);
                                    newLines.push(rendered);
                                }
                            }
                            else if (line.includes("%category")) {
                                newLines.push(line.replace(/%category/gi, tagDisplayName));
                            }
                            else {
                                newLines.push(line);
                            }
                        }
                        text = newLines.join("\n");
                    }
                }
            }
            const hasCustomCategory = categoryKeys.some(key => text.includes(`%${tagNames[key]}`));
            if (!hasCustomCategory && text.includes("%cmd")) {
                const lines = text.split("\n");
                let cmdIndex = -1;
                let cmdLine = "";
                let descLine = "";
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes("%cmd")) {
                        cmdIndex = i;
                        cmdLine = lines[i];
                        break;
                    }
                }
                for (let i = 0; i < lines.length; i++) {
                    if (i !== cmdIndex && lines[i].includes("%desc")) {
                        descLine = lines[i];
                        break;
                    }
                }
                if (cmdIndex === -1) {
                    finalText = text;
                    return;
                }
                let formatLine = cmdLine;
                if (cmdLine.includes("%desc")) {
                    formatLine = cmdLine;
                }
                else if (descLine) {
                    formatLine = cmdLine + "\n" + descLine;
                }
                let allCommands = "";
                const orderedTags = Object.keys(tags);
                for (const tag of orderedTags) {
                    if (!grouped[tag])
                        continue;
                    for (const item of grouped[tag]) {
                        let result = formatLine
                            .replace(/%cmd/gi, item.cmd)
                            .replace(/%desc/gi, item.desc);
                        allCommands += result + "\n";
                    }
                }
                let before = "";
                for (let i = 0; i < cmdIndex; i++) {
                    before += lines[i] + "\n";
                }
                let after = "";
                for (let i = cmdIndex + 1; i < lines.length; i++) {
                    after += lines[i] + "\n";
                }
                text = before + allCommands + after;
            }
            finalText = text;
        }
        else {
            let text = defaultMenu.before
                .replace(/%name/gi, variables.name)
                .replace(/%tag/gi, variables.tag)
                .replace(/%fecha/gi, variables.fecha)
                .replace(/%hora/gi, variables.hora)
                .replace(/%wm/gi, variables.wm)
                .replace(/%muptime/gi, variables.muptime)
                .replace(/%limit/gi, variables.limit)
                .replace(/%botOfc/gi, variables.botOfc)
                .replace(/%toUserReg/gi, variables.toUserReg)
                .replace(/%prefix/gi, variables.prefix)
                .replace(/%toUsers/gi, variables.toUsers);
            const cmdList = generateAllCommandsWithCategories();
            finalText = text + "\n" + cmdList + defaultMenu.after;
        }
        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            mentionedJid: [m.sender]
        };
        if (isActive) {
            contextInfo.forwardedNewsletterMessageInfo = {
                newsletterJid: jid,
                newsletterName: name
            };
        }
        if (menuType === "image" && menuMedia) {
            await conn.sendMessage(m.chat, { image: { url: menuMedia }, caption: finalText, contextInfo }, { quoted: m });
        }
        else if (menuType === "video" && menuMedia) {
            await conn.sendMessage(m.chat, { video: { url: menuMedia }, caption: finalText, contextInfo }, { quoted: m });
        }
        else {
            await conn.reply(m.chat, finalText, m, {
                thumbnail: Buffer.from(await (await fetch(global.icono())).arrayBuffer()),
                title: "MENU - PRINCIPAL",
                description: `ᴢᴇɴᴛʀɪx-ʙᴏᴛ (${tipo})`,
                largeThumbnail: false,
                previewType: "video",
                thumbnailUrl: "https://www.instagram.com/edi504_"
            });
            //conn.sendMessage(m.chat, { text: finalText, contextInfo }, { quoted: m })
        }
    }
};
