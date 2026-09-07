import fetch from 'node-fetch';
import { db } from "../lib/db.js";
function pickRandom(list) {
    if (!list || list.length === 0)
        return '❓';
    return list[Math.floor(Math.random() * list.length)];
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// ========== OBTENER NÚMERO DESDE DB (SOLO PARA @lid) ==========
async function getNumFromDB(lid) {
    try {
        if (!lid.endsWith('@lid'))
            return null;
        const res = await db.query(`SELECT num FROM usuarios WHERE lid = $1`, [lid]);
        if (res.rows.length > 0 && res.rows[0].num) {
            return res.rows[0].num;
        }
        return null;
    }
    catch {
        return null;
    }
}
// ========== OBTENER DISPLAY NAME ==========
async function getDisplayName(conn, chatId, p) {
    if (!p)
        return '???';
    if (p.phoneNumber)
        return `@${p.phoneNumber.split('@')[0]}`;
    if (p.id?.endsWith('@s.whatsapp.net'))
        return `@${p.id.split('@')[0]}`;
    if (p.id?.endsWith('@lid')) {
        const num = await getNumFromDB(p.id);
        if (num)
            return `@${num}`;
    }
    if (p.username)
        return `@${p.username}`;
    return '???';
}
// ========== OBTENER ID REAL ==========
async function getRealId(conn, chatId, p) {
    if (!p)
        return null;
    if (p.phoneNumber)
        return p.phoneNumber;
    if (p.id?.endsWith('@s.whatsapp.net'))
        return p.id;
    if (p.id?.endsWith('@lid')) {
        const num = await getNumFromDB(p.id);
        if (num)
            return `${num}@s.whatsapp.net`;
        return p.id;
    }
    return p.id || p.phoneNumber;
}
// ========== RESOLVER USUARIO ==========
async function resolverUsuario(usuario, usuarios, conn, chatId) {
    let p = null;
    let name = `@${usuario}`;
    let id = usuario;
    // 1️⃣ PRIMERO: Buscar en DB por lid (directo)
    const dbRes = await db.query(`SELECT num, id FROM usuarios WHERE lid = $1`, [usuario]);
    if (dbRes.rows.length > 0) {
        const user = dbRes.rows[0];
        if (user.num) {
            p = { id: `${user.num}@s.whatsapp.net`, phoneNumber: `${user.num}@s.whatsapp.net` };
            name = `@${user.num}`;
            id = `${user.num}@s.whatsapp.net`;
            return { name, id, participant: p };
        }
    }
    // 2️⃣ SEGUNDO: Buscar en participantes del grupo
    p = usuarios.find((u) => {
        return u.id === usuario ||
            u.lid === usuario ||
            u.phoneNumber === usuario ||
            u.phoneNumber?.split('@')[0] === usuario.replace(/[^0-9]/g, '');
    });
    if (p) {
        if (p.lid) {
            const dbRes2 = await db.query(`SELECT num FROM usuarios WHERE lid = $1`, [p.lid]);
            if (dbRes2.rows.length > 0 && dbRes2.rows[0].num) {
                const num = dbRes2.rows[0].num;
                p = { id: `${num}@s.whatsapp.net`, phoneNumber: `${num}@s.whatsapp.net` };
                name = `@${num}`;
                id = `${num}@s.whatsapp.net`;
                return { name, id, participant: p };
            }
        }
        if (p.phoneNumber) {
            const num = p.phoneNumber.split('@')[0];
            name = `@${num}`;
            id = p.phoneNumber;
        }
        else if (p.id && p.id.endsWith('@s.whatsapp.net')) {
            name = `@${p.id.split('@')[0]}`;
            id = p.id;
        }
        else if (p.username) {
            name = `@${p.username}`;
            id = p.lid || p.id;
        }
        return { name, id, participant: p };
    }
    // 3️⃣ TERCERO: Buscar en DB por num
    const numLimpio = usuario.replace(/[^0-9]/g, '');
    if (numLimpio) {
        const dbRes3 = await db.query(`SELECT num FROM usuarios WHERE num = $1`, [numLimpio]);
        if (dbRes3.rows.length > 0 && dbRes3.rows[0].num) {
            const num = dbRes3.rows[0].num;
            p = { id: `${num}@s.whatsapp.net`, phoneNumber: `${num}@s.whatsapp.net` };
            name = `@${num}`;
            id = `${num}@s.whatsapp.net`;
            return { name, id, participant: p };
        }
    }
    // 4️⃣ CUARTO: Buscar en DB por id
    if (usuario.includes('@s.whatsapp.net')) {
        const dbRes4 = await db.query(`SELECT num FROM usuarios WHERE id = $1`, [usuario]);
        if (dbRes4.rows.length > 0 && dbRes4.rows[0].num) {
            const num = dbRes4.rows[0].num;
            p = { id: `${num}@s.whatsapp.net`, phoneNumber: `${num}@s.whatsapp.net` };
            name = `@${num}`;
            id = `${num}@s.whatsapp.net`;
            return { name, id, participant: p };
        }
    }
    return { name, id, participant: null };
}
export default {
    name: ["love", "gay2", "lesbiana", "pajero", "pajera", "puto", "puta", "manco", "manca", "rata", "prostituta", "prostituto", "amigorandom", "amistad", "formarpareja", "gay", "personalidad", "ship", "topgays", "top", "topputos", "toplindos", "toppajeros", "topshipost", "toppanafresco", "topgrasa", "topintegrantes", "topotakus", "topfamosos", "topparejas", "doxxeo", "follar", "violar"],
    help: ["love", "lesbiana", "pajero", "pajera", "puto", "puta", "manco", "manca", "rata", "prostituta", "prostituto", "amigorandom", "formarpareja", "gay", "personalidad", "ship", "topgays", "top", "topputos", "toplindos", "toppajeros", "topshipost", "toppanafresco", "topgrasa", "topintegrantes", "topotakus", "topfamosos", "topparejas", "doxxeo", "follar"],
    desc: "Juegos de diversión en el grupo",
    tags: ["game"],
    group: true,
    register: true,
    run: async ({ conn, m, args, text, prefijo, cmd, participants, metadata }) => {
        const userId = m.sender;
        const chatId = m.chat;
        const lid = m.lid || "";
        // OBTENER PARTICIPANTES DEL GRUPO
        let ps = [];
        try {
            if (metadata?.participants?.length > 0) {
                ps = metadata.participants;
            }
            else {
                const meta = await conn.groupMetadata(chatId);
                ps = meta.participants;
            }
        }
        catch {
            return m.reply("❌ No pude obtener la lista de participantes.");
        }
        // FILTRAR BOT
        const botId = conn.user?.id?.split(':')[0] || '';
        const botLid = conn.user?.lid?.split(':')[0] || '';
        const usuarios = ps.filter((p) => {
            const jid = p.id || p.phoneNumber || '';
            if (jid.includes(botId) || jid.includes(botLid))
                return false;
            if (jid.replace(/[^0-9]/g, '').length < 10)
                return false;
            return true;
        });
        if (usuarios.length < 3)
            return m.reply(null, "❌ El grupo necesita al menos 3 participantes.");
        // SELECCIONAR ALEATORIOS (SOLO DEL GRUPO)
        const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const a = rand(usuarios), b = rand(usuarios), c = rand(usuarios), d = rand(usuarios);
        const e = rand(usuarios), f = rand(usuarios), g = rand(usuarios), h = rand(usuarios);
        const i = rand(usuarios), j = rand(usuarios);
        const aName = await getDisplayName(conn, chatId, a);
        const bName = await getDisplayName(conn, chatId, b);
        const cName = await getDisplayName(conn, chatId, c);
        const dName = await getDisplayName(conn, chatId, d);
        const eName = await getDisplayName(conn, chatId, e);
        const fName = await getDisplayName(conn, chatId, f);
        const gName = await getDisplayName(conn, chatId, g);
        const hName = await getDisplayName(conn, chatId, h);
        const iName = await getDisplayName(conn, chatId, i);
        const jName = await getDisplayName(conn, chatId, j);
        const aId = await getRealId(conn, chatId, a);
        const bId = await getRealId(conn, chatId, b);
        const cId = await getRealId(conn, chatId, c);
        const dId = await getRealId(conn, chatId, d);
        const eId = await getRealId(conn, chatId, e);
        const fId = await getRealId(conn, chatId, f);
        const gId = await getRealId(conn, chatId, g);
        const hId = await getRealId(conn, chatId, h);
        const iId = await getRealId(conn, chatId, i);
        const jId = await getRealId(conn, chatId, j);
        const mentions = [aId, bId, cId, dId, eId, fId, gId, hId, iId, jId].filter(Boolean);
        if (cmd === 'gay') {
            const who = m.mentionedJid[0] || m.sender;
            const random = getRandomInt(1, 100);
            let gay = '';
            if (random < 20) {
                gay = 'Usted es hetero 🤪🤙';
            }
            else if (random >= 20 && random <= 30) {
                gay = pickRandom(['Mas o menos 🤔', 'Tengo mis dudas 😑']);
            }
            else if (random >= 31 && random <= 40) {
                gay = pickRandom(['Tengo mis dudas 😑', 'Eres o no? 🧐']);
            }
            else if (random >= 41 && random <= 50) {
                gay = pickRandom(['Tengo razon? 😏', 'Eres o no? 🧐']);
            }
            else if (random > 50 && random <= 60) {
                gay = pickRandom(['Usted es gay 🥸', 'Ya sabemos 🫢']);
            }
            else if (random > 60 && random <= 75) {
                gay = pickRandom(['Usted es gay 🥸', 'Es muy gay 🏳️‍🌈']);
            }
            else if (random > 75 && random <= 90) {
                gay = pickRandom(['Es super gay 🏳️‍🌈', 'Es de la comunidad 🏳️‍🌈']);
            }
            else {
                gay = pickRandom(['Es ultra gay 🏳️‍🌈', 'Es el más gay del grupo 🏳️‍🌈']);
            }
            const p = usuarios.find((p) => p.id === who || p.lid === who || p.phoneNumber === who);
            const whoName = p ? await getDisplayName(conn, chatId, p) : `@${who.split('@')[0]}`;
            const jawab = `${whoName} es 🏳️‍🌈 ${random}% Gay\n\n${gay}`;
            try {
                const avatar = await conn.profilePictureUrl(who, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');
                const imageRes = await fetch(`https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(avatar)}`);
                const buffer = await imageRes.buffer();
                await conn.sendMessage(chatId, { image: buffer, caption: jawab, mentions: [who] }, { quoted: m });
            }
            catch {
                return m.reply(jawab, null, { mentions: [who] });
            }
            return;
        }
        if (['gay2', 'lesbiana', 'pajero', 'pajera', 'puto', 'puta', 'manco', 'manca', 'rata', 'prostituto', 'prostituta'].includes(cmd)) {
            if (!text)
                return m.reply(null, `🤔 Etiqueta a la persona con @Tag`);
            const who = m.mentionedJid[0] || text;
            const p = usuarios.find((p) => p.id === who || p.lid === who || p.phoneNumber === who);
            const whoName = p ? await getDisplayName(conn, chatId, p) : `@${who.split('@')[0]}`;
            const random = getRandomInt(1, 100);
            let label = '';
            let emoji = '';
            switch (cmd) {
                case 'gay2':
                    label = 'GAY';
                    emoji = '🏳️‍🌈';
                    break;
                case 'lesbiana':
                    label = 'LESBIANA';
                    emoji = '🏳️‍🌈';
                    break;
                case 'pajero':
                    label = 'PAJERO';
                    emoji = '😏💦';
                    break;
                case 'pajera':
                    label = 'PAJERA';
                    emoji = '😏💦';
                    break;
                case 'puto':
                    label = 'PUTO';
                    emoji = '🔥🥵';
                    break;
                case 'puta':
                    label = 'PUTA';
                    emoji = '🔥🥵';
                    break;
                case 'manco':
                    label = 'MANCO';
                    emoji = '💩';
                    break;
                case 'manca':
                    label = 'MANCA';
                    emoji = '💩';
                    break;
                case 'rata':
                    label = 'RATA';
                    emoji = '🐁 COME QUESO 🧀';
                    break;
                case 'prostituto':
                    label = 'PROSTITUTO';
                    emoji = '🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD';
                    break;
                case 'prostituta':
                    label = 'PROSTITUTA';
                    emoji = '🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD';
                    break;
            }
            let frase = '';
            if (random < 20) {
                frase = pickRandom(['Ni de casualidad', 'Para nada', 'No creo']);
            }
            else if (random >= 20 && random < 40) {
                frase = pickRandom(['Puede ser', 'A lo mejor', 'Quién sabe']);
            }
            else if (random >= 40 && random < 60) {
                frase = pickRandom(['Seguro que sí', 'Totalmente']);
            }
            else if (random >= 60 && random < 80) {
                frase = pickRandom(['Es muy ' + label.toLowerCase(), 'Es un/a ' + label.toLowerCase() + ' de cuidado']);
            }
            else {
                frase = pickRandom(['Es el/la rey/ra de los/as ' + label.toLowerCase() + 's', 'Es el/la más ' + label.toLowerCase() + ' del grupo']);
            }
            const mensaje = `_*${whoName}* es *${random}%* ${label} ${emoji}_`;
            m.react(emoji);
            return m.reply(mensaje, `\n${frase}`, null, { mentions: [who] });
        }
        // ========== LOVE ==========
        if (cmd === 'love') {
            if (!text)
                return m.reply(null, `🤔 Etiqueta a una o dos personas con @Tag`);
            const random = getRandomInt(1, 100);
            let msg = '';
            let mentions = [];
            if (m.mentionedJid && m.mentionedJid.length >= 2) {
                const r1 = await resolverUsuario(m.mentionedJid[0], usuarios, conn, chatId);
                const r2 = await resolverUsuario(m.mentionedJid[1], usuarios, conn, chatId);
                msg = `*El amor de ${r1.name} por ${r2.name} es de ${random}% de un 100%*`;
                mentions = [r1.id, r2.id].filter(Boolean);
            }
            else if (m.mentionedJid && m.mentionedJid.length === 1) {
                const who = m.mentionedJid[0];
                const r1 = await resolverUsuario(who, usuarios, conn, chatId);
                // "ti" es el que ejecuta el comando (m.sender)
                const ti = await resolverUsuario(m.sender, usuarios, conn, chatId);
                msg = `*El amor de ${r1.name} por ti es de ${random}% de un 100%*`;
                mentions = [r1.id, ti.id].filter(Boolean);
            }
            else {
                return m.reply(`🤔 Etiqueta a una persona con @Tag`);
            }
            const emoji = random > 70 ? '*Deberias pedirle que sea tu  novia/o ?*' : random > 40 ? '😆 Hay química!' : 'Solo te ver como un amigo 😂';
            m.react("💞");
            return m.reply(`*❤️❤️ MEDIDOR DE AMOR ❤️❤️*\n\n${msg}`, `\n*Deberias pedirle que sea tu  novia/o ?*`, null, { mentions });
        }
        // ========== SHIP ==========
        if (cmd === 'ship' || cmd === 'shippear') {
            if (!text)
                return m.reply(`⚠️ Escribe el nombre de dos personas`);
            let name1 = '?', name2 = '?';
            let id1 = null, id2 = null;
            if (m.mentionedJid && m.mentionedJid.length >= 2) {
                const r1 = await resolverUsuario(m.mentionedJid[0], usuarios, conn, chatId);
                const r2 = await resolverUsuario(m.mentionedJid[1], usuarios, conn, chatId);
                name1 = r1.name;
                name2 = r2.name;
                id1 = r1.id;
                id2 = r2.id;
            }
            else if (m.mentionedJid && m.mentionedJid.length === 1) {
                const parts = text.split(' ');
                const r1 = await resolverUsuario(m.mentionedJid[0], usuarios, conn, chatId);
                const r2 = await resolverUsuario(parts[1]?.replace('@', '') || '?', usuarios, conn, chatId);
                name1 = r1.name;
                name2 = r2.name;
                id1 = r1.id;
                id2 = r2.id;
            }
            else {
                const parts = text.split(' ');
                const r1 = await resolverUsuario(parts[0]?.replace('@', '') || '?', usuarios, conn, chatId);
                const r2 = await resolverUsuario(parts[1]?.replace('@', '') || r1.name.replace('@', ''), usuarios, conn, chatId);
                name1 = r1.name;
                name2 = r2.name;
                id1 = r1.id;
                id2 = r2.id;
            }
            const random = getRandomInt(1, 100);
            let frase = '';
            if (random >= 80) {
                frase = pickRandom(['💕 ¡Son el uno para el otro!', '💖 Amor verdadero!', '💗 Destinados a estar juntos!']);
            }
            else if (random >= 60) {
                frase = pickRandom(['😊 Hay química!', '💞 Buena conexión!', '🥰 Se llevan bien!']);
            }
            else if (random >= 40) {
                frase = pickRandom(['🤔 Puede funcionar...', '😅 Tal vez con tiempo', '🧐 Interesante pareja']);
            }
            else if (random >= 20) {
                frase = pickRandom(['😬 Mejor como amigos', '🙄 No lo veo claro', '😐 Cero química']);
            }
            else {
                frase = pickRandom(['💀 Ni de broma', '😱 Eso es un NO rotundo', '🤮 Qué asco de pareja']);
            }
            const mentions = [id1, id2].filter(Boolean);
            m.react("💞");
            return m.reply(`_❤️ *${name1}* tu oportunidad de enamorarte de *${name2}* es de *${random}%* 👩🏻‍❤️‍👨🏻_`, `\n${frase}`, null, { mentions });
        }
        // ========== AMISTAD ==========
        if (cmd === 'amistad' || cmd === 'amigorandom') {
            m.react("😉");
            return m.reply(`*🔰 Vamos a hacer algunas amistades 🔰*\n\n*Oye ${aName} hablale al privado a ${bName} para que jueguen y se haga una amistad 🙆*\n\n*Las mejores amistades empiezan con un juego 😉*`, null, { mentions: [aId, bId] });
        }
        // ========== FORMAR PAREJA ==========
        if (cmd === 'formarpareja' || cmd === 'formarparejas') {
            m.react("💗");
            return m.reply(`*${aName} ya es hora de que te cases con ${bName} linda pareja 😉💓*`, null, { mentions: [aId, bId] });
        }
        // ========== PERSONALIDAD ==========
        if (cmd === 'personalidad') {
            let nombre = text || 'Desconocido';
            // Si hay mención, usar el nombre del mencionado
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const who = m.mentionedJid[0];
                const p = usuarios.find((u) => u.id === who || u.lid === who || u.phoneNumber === who);
                nombre = p ? await getDisplayName(conn, chatId, p) : `@${who.split('@')[0]}`;
            }
            const personalidad = `┏━━°❀❬ *PERSONALIDAD* ❭❀°━━┓
*┃*
*┃• Nombre* : ${nombre}
*┃• Buena Moral* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Mala Moral* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Tipo de persona* : ${pickRandom(['De buen corazón', 'Arrogante', 'Tacaño', 'Generoso', 'Humilde', 'Tímido', 'Cobarde', 'Entrometido', 'Cristal', 'No binarie XD', 'Pendejo'])}
*┃• Siempre* : ${pickRandom(['Pesado', 'De malas', 'Distraido', 'De molestoso', 'Chismoso', 'Pasa jalandosela', 'De compras', 'Viendo anime', 'Chatea en WhatsApp porque esta soltero', 'Acostado bueno para nada', 'De mujeriego', 'En el celular'])}
*┃• Inteligencia* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Morosidad* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Coraje* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Miedo* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Fama* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Género* : ${pickRandom(['Hombre', 'Mujer', 'Homosexual', 'Bisexual', 'Pansexual', 'Feminista', 'Heterosexual', 'Macho alfa', 'Mujerzona', 'Marimacha', 'Palosexual', 'PlayStationSexual', 'Sr. Manuela', 'Pollosexual'])}
┗━━━━━━━━━━━━━━━━`;
            const mentions = m.mentionedJid || [];
            m.react("👻");
            return m.reply(personalidad, null, { mentions });
        }
        // ========== DOXXEO ==========
        if (cmd === 'doxxeo' || cmd === 'doxxear' || cmd === 'doxeo' || cmd === 'doxear' || cmd === 'doxxeame' || cmd === 'doxeame') {
            let nombre = text || 'Desconocido';
            let who = m.sender;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                who = m.mentionedJid[0];
                const p = usuarios.find((u) => u.id === who || u.lid === who || u.phoneNumber === who);
                nombre = p ? await getDisplayName(conn, chatId, p) : `@${who.split('@')[0]}`;
            }
            // Datos random
            const ips = ['192.168.' + getRandomInt(1, 255) + '.' + getRandomInt(1, 255), '10.0.' + getRandomInt(1, 255) + '.' + getRandomInt(1, 255), '172.16.' + getRandomInt(1, 31) + '.' + getRandomInt(1, 255)];
            const macs = ['AA:BB:CC:DD:EE:FF', '00:1A:2B:3C:4D:5E', 'F0:9E:4A:3B:2C:1D', '5A:78:3E:7E:00:' + getRandomInt(10, 99), 'B0:75:D5:8A:6F:3E', 'C8:2A:14:9E:7D:5F'];
            const isps = ['TORNADO SLK PRODUCTION', 'MOVISTAR', 'CLARO', 'TELCEL', 'AT&T', 'WIZZ', 'TIGO', 'ENTEL', 'PERSONAL', 'VODAFONE'];
            const routers = ['ERICCSON', 'CISCO', 'HUAWEI', 'TP-LINK', 'NETGEAR', 'ASUS', 'D-LINK', 'ZTE', 'MOTOROLA'];
            const devices = ['WIN32-X', 'WIN64-X', 'LINUX-ARM', 'ANDROID-12', 'IOS-16', 'MAC-OSX', 'WINDOWS-11', 'UBUNTU-22.04', 'DEBIAN-11'];
            const calles = ['Av. Principal', 'Calle 7', 'Av. Libertador', 'Calle Real', 'Av. 9 de Julio', 'Carrera 7', 'Av. Insurgentes', 'Jirón de la Unión'];
            const navegadores = ['Chrome 120.0.6099.109', 'Firefox 121.0', 'Safari 17.2', 'Edge 120.0.2210.133', 'Opera 106.0.4998.66', 'Brave 1.61.114'];
            const sistemas = ['Windows 11 Pro 23H2', 'Windows 10 Pro 22H2', 'macOS Sonoma 14.2', 'Ubuntu 22.04.3 LTS', 'Android 14', 'iOS 17.2'];
            const antivirus = ['Windows Defender', 'Avast', 'McAfee', 'Norton', 'Kaspersky', 'Bitdefender', 'ESET'];
            const redes = ['TP-Link Archer C6', 'Mercusys AC1200', 'D-Link DIR-842', 'Asus RT-AC1200', 'Huawei HG8245H', 'ZTE F680'];
            const telecom = ['FTTH (Fibra Óptica)', 'ADSL', 'Cablemodem', 'Fibra 5G', '4G LTE', 'Satelital'];
            const correo = ['tumami@gmail.com', 'elpro500@gmail.com', 'admin@hotmail.com', 'root@hotmail.com', 'admin@gmail.com', 'guest@gmail.com', 'administrador@gmail.com'];
            const cuentas = ['admin', 'root', 'user', 'guest', 'administrador', 'password123'];
            const contraseña = ['admin123', 'root123', 'user', 'guest', 'password123', '123456', 'pene123'];
            const sistemasArchivo = ['NTFS', 'FAT32', 'exFAT', 'ext4', 'APFS'];
            const protocolos = ['TCP/IPv4', 'TCP/IPv6', 'HTTP/3', 'HTTPS', 'FTP', 'SSH', 'Telnet'];
            const doxeo = `*✅ ¡PERSONA HACKEADA CON ÉXITO! 🤣*\n\n📌 *RESULTADOS:*\n*Nombre:* ${nombre}\n*ID:* ${pickRandom(['DNI', 'CÉDULA', 'RUT', 'CPF'])}: ${getRandomInt(10000000, 99999999)}-${getRandomInt(0, 9)}\n*Edad:* ${getRandomInt(18, 65)} años\n*Género:* ${pickRandom(['Hombre', 'Mujer', 'Homosexual', 'Bisexual', 'Pansexual', 'Feminista', 'Heterosexual', 'Macho alfa', 'Mujerzona', 'Marimacha', 'Palosexual', 'PlayStationSexual', 'Sr. Manuela', 'Pollosexual'])}\n*Dirección:* ${pickRandom(calles)} ${getRandomInt(100, 9999)}\n*Código Postal:* ${getRandomInt(1000, 9999)}\n\n🖥️ *INFORMACIÓN TÉCNICA*\n*IP:* ${pickRandom(ips)}\n*IPV6:* fe80::${getRandomInt(1000, 9999)}:${getRandomInt(1000, 9999)}:${getRandomInt(1000, 9999)}%${getRandomInt(10, 99)}\n*MAC:* ${pickRandom(macs)}\n*SSID:* ${pickRandom(redes)}\n*DNS:* 8.8.8.8\n*DNS Secundario:* 1.1.1.1\n*Gateway:* 192.168.0.1\n*Máscara Subred:* 255.255.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}\n*ISP:* ${pickRandom(isps)}\n*Tipo Conexión:* ${pickRandom(telecom)}\n*Router:* ${pickRandom(routers)}\n*UPNP:* ${pickRandom(['Enabled', 'Disabled'])}\n*Puertos Abiertos:* ${getRandomInt(1000, 9999)}, ${getRandomInt(1000, 9999)}, ${getRandomInt(1000, 9999)}\n*Protocolos:* ${pickRandom(protocolos)}, ${pickRandom(protocolos)}\n\n💻 *SISTEMA OPERATIVO*\n*OS:* ${pickRandom(sistemas)}\n*Arquitectura:* ${pickRandom(['x64', 'ARM64', 'x86'])}\\n*Navegador:* ${pickRandom(navegadores)}\n*Antivirus:* ${pickRandom(antivirus)}\n*Sistema Archivos:* ${pickRandom(sistemasArchivo)}\n\n📱 *DISPOSITIVO*\n*Fabricante:* ${pickRandom(['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Motorola', 'Lenovo', 'Dell', 'HP', 'Acer'])}\n*Modelo:* ${pickRandom(['Galaxy S24', 'iPhone 15 Pro', 'Redmi Note 12', 'Mate 60 Pro', 'Moto G84', 'ThinkPad T14', 'Dell XPS 13', 'HP Pavilion'])}\n*Almacenamiento:* ${pickRandom(['1GB', '3GB', '10GB', '40GB', '62GB', '128GB', '256GB', '512GB'])}\n*RAM:* ${pickRandom(['10MB', '1GB', '3GB', '5GB', '32GB'])}\n\n🔐 *CREDENCIALES*\n*Correo:* ${pickRandom(correo)}\n*Usuario:* ${pickRandom(cuentas)}\n*Contraseña:* ${pickRandom(contraseña)}\n*Contraseña (hash):* ${pickRandom(['5f4dcc3b5aa765d61d8327deb882cf99', 'e10adc3949ba59abbe56e057f20f883e', '25f9e794323b453885f5181f1b624d0b', '7c4a8d09ca3762af61e59520943dc264'])}\n*Token:* ${pickRandom(['eyJhbGciOiJIUzI1NiIs', 'dG9rZW5fc2VjcmV0b19xdWFu', 'MTIzNDU2Nzg5MGFiY2RlZg'])}`;
            // Enviar mensaje inicial y guardar la referencia
            const sent = await conn.sendMessage(chatId, { text: '🔍 *Iniciando doxxeo...*\n\n0% ░░░░░░░░░░░░░░░░░░░░' }, { quoted: m });
            const steps = [
                { text: '🔍 *Escaneando puertos...*\n\n15% ████████░░░░░░░░░░░░', delay: 600 },
                { text: '🔍 *Analizando paquetes...*\n\n30% ████████████████░░░░░░', delay: 600 },
                { text: '🔍 *Rastreando IP...*\n\n45% ████████████████████░░', delay: 600 },
                { text: '🔍 *Descifrando datos...*\n\n60% ████████████████████████', delay: 600 },
                { text: '🔍 *Accediendo a la base de datos...*\n\n80% ████████████████████████████', delay: 600 },
                { text: '🔍 *Recopilando información...*\n\n95% ████████████████████████████████', delay: 600 },
            ];
            for (const step of steps) {
                await new Promise(resolve => setTimeout(resolve, step.delay));
                await conn.sendMessage(chatId, { text: step.text, edit: sent.key });
            }
            await new Promise(resolve => setTimeout(resolve, 400));
            const mentions = m.mentionedJid || [];
            await conn.sendMessage(chatId, { text: doxeo, edit: sent.key, mentions });
            m.react("🕵️‍♀️");
            return;
        }
        // ========== FOLLAR / VIOLAR ==========
        if (cmd === 'follar' || cmd === 'violar') {
            if (!text)
                return m.reply(`*Ingrese el @ o el nombre de la persona*`);
            const userMention = m.mentionedJid[0] || m.quoted?.sender || text;
            const p = usuarios.find((p) => p.id === userMention || p.lid === userMention || p.phoneNumber === userMention);
            const userMentionName = p ? await getDisplayName(conn, chatId, p) : `@${userMention.split('@')[0]}`;
            m.react("🥵");
            return m.reply(`🤤👅🥵 *𝐀𝐂𝐀𝐁𝐀𝐒 𝐃𝐄 𝐅𝐎𝐋𝐋𝐀𝐑𝐓𝐄𝐋@!*🥵👅🤤\n\n*𝙏𝙚 𝙖𝙘𝙖𝙗𝙖𝙨 𝙙𝙚 𝙛𝙤𝙡𝙡𝙖𝙧 𝙖 𝙡𝙖 𝙥𝙚𝙧𝙧𝙖 𝙙𝙚* *${userMentionName}* ⁩ *𝙖 𝟰 𝙥𝙖𝙩𝙖𝙨 𝙢𝙞𝙚𝙣𝙩𝙧𝙖𝙨 𝙩𝙚 𝙜𝙚𝙢𝙞𝙖 𝙘𝙤𝙢𝙤 𝙪𝙣𝙖 𝙢𝙖𝙡𝙙𝙞𝙩𝙖 𝙥𝙚𝙧𝙧𝙖 "𝐀𝐚𝐚𝐡.., 𝐀𝐚𝐚𝐡𝐡, 𝐬𝐢𝐠𝐮𝐞, 𝐧𝐨 𝐩𝐚𝐫𝐞𝐬, 𝐧𝐨 𝐩𝐚𝐫𝐞𝐬.." 𝙮 𝙡𝙖 𝙝𝙖𝙨 𝙙𝙚𝙟𝙖𝙙𝙤 𝙩𝙖𝙣 𝙧𝙚𝙫𝙚𝙣𝙩𝙖𝙙𝙖 𝙦𝙪𝙚 𝙣𝙤 𝙥𝙪𝙚𝙙𝙚 𝙨𝙤𝙨𝙩𝙚𝙣𝙚𝙧 𝙣𝙞 𝙨𝙪 𝙥𝙧𝙤𝙥𝙞𝙤 𝙘𝙪𝙚𝙧𝙥𝙤 𝙡𝙖 𝙢𝙖𝙡𝙙𝙞𝙩𝙖 𝙯𝙤𝙧𝙧𝙖!*\n\n*${userMentionName}*`, `🤤🥵 *¡𝐘𝐀 𝐓𝐄 𝐇𝐀𝐍 𝐅𝐎𝐋𝐋𝐀𝐃𝐎!* 🥵🤤`, null, { mentions: [userMention] });
        }
        // ========== TOP ==========
        if (cmd === 'top') {
            if (!text)
                return m.reply(`🤔 Ingresa un tema para el top\nEjemplo: ${prefijo}top gamers`);
            const x = pickRandom(['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚']);
            let k = Math.floor(Math.random() * 10) + 1; // 1 al 10
            const audios = [
                'https://www.orangefreesounds.com/wp-content/uploads/2019/01/Minimal-electro-synth-loop-120-bpm.mp3', // 8s
                'https://www.orangefreesounds.com/wp-content/uploads/2022/03/Electro-drum-beat-loop.mp3', // 4s
                'https://www.orangefreesounds.com/wp-content/uploads/2021/08/Electro-loop-102-bpm.mp3', // 19s
                'https://www.orangefreesounds.com/wp-content/uploads/2014/11/Electro-drum-loop-123-bpm.mp3', // 15s
                'https://orangefreesounds.com/wp-content/uploads/2024/01/Old-school-electronic-music-loop.mp3' // 33s
            ];
            let vn = audios[Math.floor(Math.random() * audios.length)];
            m.react(x);
            await conn.sendMessage(m.chat, { audio: { url: vn }, mimetype: "audio/mpeg" }, { quoted: m });
            return m.reply(`*${x} Top 10 ${text} ${x}*\n\n` +
                `*1. ${aName}*\n` +
                `*2. ${bName}*\n` +
                `*3. ${cName}*\n` +
                `*4. ${dName}*\n` +
                `*5. ${eName}*\n` +
                `*6. ${fName}*\n` +
                `*7. ${gName}*\n` +
                `*8. ${hName}*\n` +
                `*9. ${iName}*\n` +
                `*10. ${jName}*`, null, { mentions });
        }
        // ========== TOP GAYS ==========
        if (cmd === 'topgays') {
            return m.reply(`*🌈TOP 10 GAYS/LESBIANAS DEL GRUPO🌈*\n\n*_1.- 🏳️‍🌈 ${aName}_*\n*_2.- 🪂 ${bName}_*\n*_3.- 🪁 ${cName}_*\n*_4.- 🏳️‍🌈 ${dName}_*\n*_5.- 🪂 ${eName}_*\n*_6.- 🪁 ${fName}_*\n*_7.- 🏳️‍🌈 ${gName}_*\n*_8.- 🪂 ${hName}_*\n*_9.- 🪁 ${iName}_*\n*_10.- 🏳️‍🌈 ${jName}_*`, null, { mentions });
        }
        // ========== TOP OTAKUS ==========
        if (cmd === 'topotakus') {
            return m.reply(`*🌸 TOP 10 OTAKUS DEL GRUPO 🌸*\n\n*_1.- 💮 ${aName}_*\n*_2.- 🌷 ${bName}_*\n*_3.- 💮 ${cName}_*\n*_4.- 🌷 ${dName}_*\n*_5.- 💮 ${eName}_*\n*_6.- 🌷 ${fName}_*\n*_7.- 💮 ${gName}_*\n*_8.- 🌷 ${hName}_*\n*_9.- 💮 ${iName}_*\n*_10.- 🌷 ${jName}_*`, null, { mentions });
        }
        // ========== TOP INTEGRANTES ==========
        if (cmd === 'topintegrantes' || cmd === 'topintegrante') {
            return m.reply(`*_💎TOP 10 L@S MEJORES INTEGRANTES👑_*\n\n*_1.- 💎 ${aName}_*\n*_2.- 👑 ${bName}_*\n*_3.- 💎 ${cName}_*\n*_4.- 👑 ${dName}_*\n*_5.- 💎 ${eName}_*\n*_6.- 👑 ${fName}_*\n*_7.- 💎 ${gName}_*\n*_8.- 👑 ${hName}_*\n*_9.- 💎 ${iName}_*\n*_10.- 👑 ${jName}_*`, null, { mentions });
        }
        // ========== TOP GRASA ==========
        if (cmd === 'topgrasa' || cmd === 'toplagrasa') {
            return m.reply(`*_Uwu TOP 10 LA GRASA Uwu_*\n\n*_1.- Bv ${aName} Bv_*\n*_2.- :v ${bName} :v_*\n*_3.- :D ${cName} :D_*\n*_4.- Owo ${dName} Owo_*\n*_5.- U.u ${eName} U.u_*\n*_6.- >:v ${fName} >:v_*\n*_7.- :'v ${gName} :'v_*\n*_8.- ._. ${hName} ._._*\n*_9.- :V ${iName} :V_*\n*_10.- XD ${jName} XD_*`, null, { mentions });
        }
        // ========== TOP PANA FRESCOS ==========
        if (cmd === 'toppanafresco' || cmd === 'toppanafrescos') {
            return m.reply(`*_👊TOP 10 PANAFRESCOS👊_*\n\n*_1.- 🤑 ${aName}_*\n*_2.- 🤙 ${bName}_*\n*_3.- 😎 ${cName}_*\n*_4.- 👌 ${dName}_*\n*_5.- 🧐 ${eName}_*\n*_6.- 😃 ${fName}_*\n*_7.- 😋 ${gName}_*\n*_8.- 🤜 ${hName}_*\n*_9.- 💪 ${iName}_*\n*_10.- 😉 ${jName}_*`, null, { mentions });
        }
        // ========== TOP SHIPOSTERS ==========
        if (cmd === 'topshipost' || cmd === 'topshiposters') {
            return m.reply(`*_😱TOP 10 SHIPOSTERS DEL GRUPO😱_*\n\n*_1.- 😈 ${aName}_*\n*_2.- 🤙 ${bName}_*\n*_3.- 🥶 ${cName}_*\n*_4.- 🤑 ${dName}_*\n*_5.- 🥵 ${eName}_*\n*_6.- 🤝 ${fName}_*\n*_7.- 😟 ${gName}_*\n*_8.- 😨 ${hName}_*\n*_9.- 😇 ${iName}_*\n*_10.- 🤠 ${jName}_*`, null, { mentions });
        }
        // ========== TOP PAJEROS ==========
        if (cmd === 'toppajeros' || cmd === 'toppajer@s') {
            return m.reply(`*_😏TOP L@S MAS PAJEROS/AS DEL GRUPO💦_*\n\n*_1.- 🥵 ${aName}_*\n*_2.- 🥵 ${bName}_*\n*_3.- 🥵 ${cName}_*\n*_4.- 🥵 ${dName}_*\n*_5.- 🥵 ${eName}_*\n*_6.- 🥵 ${fName}_*\n*_7.- 🥵 ${gName}_*\n*_8.- 🥵 ${hName}_*\n*_9.- 🥵 ${iName}_*\n*_10.- 🥵 ${jName}_*`, null, { mentions });
        }
        // ========== TOP LINDOS ==========
        if (cmd === 'toplindos' || cmd === 'toplind@s') {
            return m.reply(`*_😳TOP L@S MAS LIND@S Y SEXIS DEL GRUPO😳_*\n\n*_1.- ✨ ${aName}_*\n*_2.- ✨ ${bName}_*\n*_3.- ✨ ${cName}_*\n*_4.- ✨ ${dName}_*\n*_5.- ✨ ${eName}_*\n*_6.- ✨ ${fName}_*\n*_7.- ✨ ${gName}_*\n*_8.- ✨ ${hName}_*\n*_9.- ✨ ${iName}_*\n*_10.- ✨ ${jName}_*`, null, { mentions });
        }
        // ========== TOP PUTOS ==========
        if (cmd === 'topputos' || cmd === 'topput@s') {
            return m.reply(`*_😏TOP L@S MAS PUT@S DEL GRUPO SON🔥_*\n\n*_1.- 👉 ${aName}_* 👌\n*_2.- 👉 ${bName}_* 👌\n*_3.- 👉 ${cName}_* 👌\n*_4.- 👉 ${dName}_* 👌\n*_5.- 👉 ${eName}_* 👌\n*_6.- 👉 ${fName}_* 👌\n*_7.- 👉 ${gName}_* 👌\n*_8.- 👉 ${hName}_* 👌\n*_9.- 👉 ${iName}_* 👌\n*_10.- 👉 ${jName}_* 👌`, null, { mentions });
        }
        // ========== TOP FAMOSOS ==========
        if (cmd === 'topfamosos' || cmd === 'topfamos@s') {
            return m.reply(`*_🌟TOP PERSONAS FAMOSAS EN EL GRUPO🌟_*\n\n*_1.- 🛫 ${aName}_*\n*_2.- 🥂 ${bName}_*\n*_3.- 🤩 ${cName}_*\n*_4.- 🛫 ${dName}_*\n*_5.- 🥂 ${eName}_*\n*_6.- 🤩 ${fName}_*\n*_7.- 🛫 ${gName}_*\n*_8.- 🥂 ${hName}_*\n*_9.- 🤩 ${iName}_*\n*_10.- 🛫 ${jName}_*`, null, { mentions });
        }
        // ========== TOP PAREJAS ==========
        if (cmd === 'topparejas' || cmd === 'top5parejas') {
            return m.reply(`*_😍 Las 5 maravillosas parejas del grupo 😍_*\n\n*_1.- ${aName} 💘 ${bName}_*\nQue hermosa pareja 💖, me invitan a su Boda 🛐\n\n*_2.- ${cName} 💘 ${dName}_*\n🌹 Ustedes se merecen lo mejor del mundo 💞\n\n*_3.- ${eName} 💘 ${fName}_*\nTan enamorados 😍, para cuando la familia 🥰\n\n*_4.- ${gName} 💘 ${hName}_*\n💗 Decreto que ustedes son la pareja del Año 💗\n\n*_5.- ${iName} 💘 ${jName}_*\nGenial! 💝, están de Luna de miel 🥵✨❤️‍🔥`, null, { mentions });
        }
        return m.reply(`⚠️ Comando no reconocido. Usa ${prefijo}help`);
    }
};
