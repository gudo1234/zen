import axios from 'axios';
import fetch from 'node-fetch';
const contenidoNSFW = {
    pack: { label: '_🥵 aqui tiene mi Pack 😏_', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/pack.json', aliases: [], viewOnce: false },
    pack2: { label: '_🥵 aqui tiene mi Pack 😏_', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/packgirl.json', aliases: [], viewOnce: false },
    pack3: { label: '_🥵 aqui tiene mi Pack 😏_', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/packmen.json', aliases: [], viewOnce: false },
    tetas: { label: '🥵 dame lechita de hay 🥵', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/tetas.json', aliases: ['pechos'], viewOnce: true },
    videoxxx: { label: '_*ᴅɪsғʀᴜᴛᴀ ᴅᴇʟ ᴠɪᴅᴇᴏ 🥵_', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/videoxxxc.json', aliases: ['vídeoxxx'], viewOnce: false },
    videoxxxlesbi: { label: '_*ᴅɪsғʀᴜᴛᴀ ᴅᴇʟ ᴠɪᴅᴇᴏ 🥵_', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/videoxxxc2.json', aliases: ['videolesbixxx', 'pornolesbivid'], viewOnce: false },
    pornololi: { label: '🥵', type: 'json', url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/pornololi.json', aliases: ['pornololi'], viewOnce: false },
    yuri: { label: '👩‍❤️‍👩 Yuri', type: 'json', url: 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json', aliases: [], viewOnce: false },
    yaoi: { label: '👨‍❤️‍👨 Yaoi', type: 'api', api: 'https://nekobot.xyz/api/image?type=yaoi', field: 'message', aliases: [], viewOnce: false },
    // 🔥 CAMBIADO: type: 'video' en lugar de 'api'
    videox: { label: '🥵', type: 'video', url: 'https://api.delirius.online/nsfw/tiktok', aliases: ["videox"], viewOnce: false },
    corean: { label: '🥵', type: 'api', api: 'https://api.delirius.online/nsfw/corean', aliases: ["china"], viewOnce: false },
    boobs: { label: 'Upa la paja 😱', type: 'api', api: 'https://api.delirius.online/nsfw/boobs', aliases: [], viewOnce: false },
    girls: { label: '🥵 Uff pa una pajita 🥵', type: 'api', api: 'https://api.delirius.online/nsfw/girls', aliases: ["porno"], viewOnce: false },
    trapito: { label: '🚺 Trapito', type: 'waifu', api: 'trap', aliases: ['trap'], viewOnce: false },
};
// Crear mapa de alias
const aliasMap = {};
for (const [key, item] of Object.entries(contenidoNSFW)) {
    aliasMap[key.toLowerCase()] = item;
    for (const alias of (item.aliases || [])) {
        aliasMap[alias.toLowerCase()] = item;
    }
}
// Obtener todos los nombres de comandos NSFW
const nsfwCommands = Object.keys(aliasMap);
export default {
    name: nsfwCommands,
    help: nsfwCommands,
    desc: "Comandos NSFW +18",
    tags: ["nsfw"],
    group: true,
    register: true,
    limit: 3,
    run: async ({ conn, m, args, cmd }) => {
        try {
            // Verificar si el comando existe
            const item = aliasMap[cmd.toLowerCase()];
            if (!item) {
                return m.reply(`❌ Comando NSFW no reconocido.`);
            }
            m.react("⏳");
            // ===== TIPO VIDEO (nuevo) =====
            if (item.type === 'video') {
                await conn.sendFile(m.chat, item.url, 'video.mp4', item.label, m, false, { viewOnce: item.viewOnce || false });
                m.success = true;
                m.react("🔥");
                return;
            }
            // ===== TIPO JSON =====
            if (item.type === 'json') {
                const { data } = await axios.get(item.url);
                const media = data[Math.floor(Math.random() * data.length)];
                await conn.sendFile(m.chat, media, 'nsfw', item.label, m, false, { viewOnce: item.viewOnce || false });
                m.success = true;
                m.react("🔥");
                return;
            }
            // ===== TIPO WAIFU =====
            if (item.type === 'waifu') {
                const res = await fetch(`https://api.waifu.pics/nsfw/${item.api}`);
                const { url } = await res.json();
                await conn.sendFile(m.chat, url, 'waifu.jpg', item.label, m, false, { viewOnce: item.viewOnce || false });
                m.success = true;
                m.react("🔥");
                return;
            }
            // ===== TIPO API =====
            if (item.type === 'api') {
                const res = await fetch(item.api);
                const contentType = res.headers.get('content-type') || '';
                if (contentType.startsWith('image/')) {
                    const buffer = Buffer.from(await res.arrayBuffer());
                    await conn.sendFile(m.chat, buffer, 'img.jpg', item.label, m, false, { viewOnce: item.viewOnce || false });
                    m.success = true;
                    m.react("🔥");
                    return;
                }
                if (contentType.startsWith('video/')) {
                    const buffer = Buffer.from(await res.arrayBuffer());
                    await conn.sendFile(m.chat, buffer, 'video.mp4', item.label, m, false, { viewOnce: item.viewOnce || false });
                    m.success = true;
                    m.react("🔥");
                    return;
                }
                const json = await res.json();
                const url = item.field ? json[item.field] : json.url || json.message;
                if (!url) {
                    return m.reply('❌ No se encontró URL en la respuesta de la API.');
                }
                await conn.sendFile(m.chat, url, 'nsfw', item.label, m, false, { viewOnce: item.viewOnce || false });
                m.success = true;
                m.react("🔥");
                return;
            }
            return m.reply('❌ Fuente NSFW no soportada.');
        }
        catch (error) {
            console.error('[NSFW ERROR]', error);
            m.react("❌");
            return m.reply(`❌ Error al enviar contenido +18.\n\n${error.message || error}`);
        }
    }
};
