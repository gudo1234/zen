import { createHash } from "crypto";
import moment from "moment-timezone";
import { db, getBotSettings } from "../lib/db.js";
import fetch from "node-fetch";
const REGEX = /^([a-zA-Z0-9 _-]{2,45})\.([0-9]{1,3})$/;
const estados = {};
async function getCountryFromNumber(jid) {
    try {
        const number = "+" + jid.split("@")[0].slice(0, 3);
        const res = await fetch(`https://api.mitzuki.xyz/tools/country?number=${encodeURIComponent(number)}&apikey=${process.env.API_KEY}`);
        const json = await res.json(); // ← Usar 'any' o definir una interfaz
        if (!json.status)
            return null;
        return `${json.data.pais} ${json.data.emoji}`;
    }
    catch {
        return null;
    }
}
function getEjemploNombre(pushName) {
    if (!pushName)
        return "elrebelde.21";
    // Solo letras (incluye acentos), espacios y guiones
    const esNormal = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]{2,30}$/.test(pushName);
    return esNormal ? `${pushName}.16` : "elrebelde.21";
}
export default {
    name: ["reg", "verificar", "verify"],
    help: ["reg <nombre.edad>"],
    desc: "registrarte en el bot",
    tags: ["rg"],
    run: async ({ conn, m, text, prefijo, cmd }) => {
        const who = m.sender;
        const users = who || m.lid;
        const res = await db.query(`SELECT registered FROM usuarios 
   WHERE id = $1 OR lid = $2
   LIMIT 1`, [who, m.lid]);
        console.log(m.sender);
        if (res.rows[0]?.registered)
            return m.reply(`*Ya estás registrado 🤨*`);
        if (estados[who])
            return m.reply("⚠️ *Ya tienes un registro en curso*");
        const match = text.trim().match(REGEX);
        const ejemplo = getEjemploNombre(m.pushName);
        if (!match)
            return m.reply(`*⚠️ ¿No sabes cómo usar este comando?* Usa de la siguiente manera:\n\n*${prefijo + cmd} nombre.edad*\n*• Ejemplo:* ${prefijo + cmd} ${ejemplo}`);
        const nombre = match[1].trim();
        const edad = parseInt(match[2]);
        if (edad < 5)
            return m.reply('🚼 ¿Los bebés saben escribir? ✍️😳');
        if (edad > 100)
            return m.reply('👴🏻 ¡Estás muy viejo para esto!');
        estados[users] = {
            step: 1,
            nombre,
            edad,
            prefijo
        };
        return m.reply(`🧑 Registro Paso 2: ¿Cuál es tu género?\n\n1. Hombre ♂️\n2. Mujer ♀️\n3. Otro 🧬\n\n*Responde con el número*`);
    },
    before: async (m, { conn }) => {
        let fkontak = { key: { participants: "0@s.whatsapp.net", remoteJid: "status@broadcast", fromMe: false, id: "Halo" }, message: { contactMessage: { vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }, participant: "0@s.whatsapp.net" };
        const who = m.sender; // @s.whatsapp.net o null
        const userLid = m.lid; // @lid o null
        const users = who || m.lid;
        const state = estados[users];
        if (!state)
            return;
        if (m.text.startsWith("/"))
            return;
        const input = m.originalText.toLowerCase().trim();
        if (state.step === 1) {
            const genero = input === "1" || input === "hombre" ? "hombre" : input === "2" || input === "mujer" ? "mujer" : input === "3" || input === "otro" ? "otro" : null;
            if (!genero)
                return m.reply("⚠️ Responde con *1, 2 o 3*");
            state.genero = genero;
            state.step = 2;
            return m.reply(`🎂 *Registro Paso 3: Fecha de cumpleaños (Opcional)*\n\nPuedes enviar tu fecha de cumpleaños en formato DD/MM/YYYY (ejemplo: 30/10/2000)\n\n> O escribe "omitir" si no quieres decirlo`);
        }
        if (state.step === 2) {
            let birthday = null;
            if (input !== "omitir" && input !== ".omitir" && input !== "cancelar") {
                const fecha = moment(input, ["DD/MM/YYYY"], true);
                if (!fecha.isValid())
                    return m.reply(`*❌ Fecha inválida, usar:* DD/MM/YYYY\n*Ejemplo:* 25/07/2025\n\n> O escribe "omitir" para saltar y terminar registros pendejo`);
                birthday = fecha.format("YYYY-MM-DD");
            }
            // ✅ OBTENER EL NÚMERO REAL DE LA METADATA
            let realId = null;
            let realNum = null;
            if (m.isGroup) {
                try {
                    const meta = await conn.groupMetadata(m.chat);
                    const participant = meta.participants.find((p) => {
                        const ids = [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean);
                        return ids.some(id => id === who || id === who.replace(/:\d+/, ""));
                    });
                    if (participant?.phoneNumber) {
                        realId = participant.phoneNumber; // @s.whatsapp.net
                        realNum = participant.phoneNumber.split('@')[0];
                    }
                    else if (participant?.id && participant.id.endsWith('@s.whatsapp.net')) {
                        realId = participant.id;
                        realNum = participant.id.split('@')[0];
                    }
                }
                catch (e) { }
            }
            // ✅ INSERT CORREGIDO (usar realId en lugar de who)
            const serial = createHash("md5").update(users).digest("hex");
            const now = new Date();
            await db.query(`INSERT INTO usuarios (id, lid, nombre, edad, gender, birthday, registered, serial_number, money, limite, exp, reg_time, num)
VALUES ($1,$2,$3,$4,$5,$6,true,$7,400,2,150,$8,$9)
ON CONFLICT (lid) DO UPDATE
SET id = EXCLUDED.id,
    nombre = EXCLUDED.nombre,
    edad = EXCLUDED.edad,
    gender = EXCLUDED.gender,
    birthday = EXCLUDED.birthday,
    registered = EXCLUDED.registered,
    serial_number = EXCLUDED.serial_number,
    num = EXCLUDED.num,
    money = usuarios.money + 400,
    limite = usuarios.limite + 2,
    exp = usuarios.exp + 150,
    reg_time = EXCLUDED.reg_time`, [realId, userLid, state.nombre + "✓", state.edad, state.genero, birthday, serial, now, realNum]);
            const date = moment.tz("America/Bogota").format("DD/MM/YYYY");
            const time = moment.tz("America/Argentina/Buenos_Aires").format("LT");
            const country = await getCountryFromNumber(who);
            const totalRegResult = await db.query("SELECT COUNT(*) AS total FROM usuarios WHERE registered = true");
            const rtotalreg = parseInt(totalRegResult.rows[0].total);
            const botId = conn.user?.id?.split(":")[0];
            const settings = await getBotSettings(botId);
            const jid = settings?.newsletter_jid || "120363321650707484@newsletter";
            const name = settings?.newsletter_name || "Mitzuki official ✨️";
            const isActive = jid && jid !== "" && jid !== "off";
            const currencyName = settings.emoji_set?.currency_name || m.e.currency_name;
            const currencyEmoji = settings.emoji_set?.currency_emoji || m.e.currency_emoji;
            const ppUrl = await fetch("https://telegra.ph/file/39fb047cdf23c790e0146.jpg");
            const img = Buffer.from(await ppUrl.arrayBuffer());
            delete estados[who];
            return conn.reply(m.chat, `
[ ✅ REGISTRO COMPLETADO ]

◉ *Nombre:* ${state.nombre}
◉ *Edad:* ${state.edad} años
◉ *Género:* ${state.genero}${birthday ? "\n◉ *Cumpleaños:* " + moment(birthday).format("DD/MM/YYYY") : ""}
◉ *Hora:* ${time}
◉ *Fecha:* ${date}${country ? "\n◉ *País:* " + country : ""}
◉ *Número:* wa.me/${who.split("@")[0]}
◉ *Número de serie:*
⤷ ${serial}

🎁 *Recompensa:*
⤷ 2 ${currencyName} ${currencyEmoji}
⤷ 150 exp

*◉ Para ver los comandos del bot usar:*
${state.prefijo}menu

◉ *Total de usuarios registrados:* ${rtotalreg}`, fkontak, {
                thumbnail: img,
                title: "𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐎 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎",
                description: "Mitzuki",
                largeThumbnail: true,
                previewType: "video",
                thumbnailUrl: "https://api.mitzuki.xyz"
            });
        }
    }
};
