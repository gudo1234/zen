import { db, getBotSettings, getPrefix } from '../lib/db.js';
import { getPlugins } from "../lib/plugins.js";
import fetch from "node-fetch";
import fs from 'fs';
import path from 'path';
import os from 'os';
const getCpuUsage = () => {
    const load = os.loadavg()[0];
    const cores = os.cpus().length;
    return ((load / cores) * 100).toFixed(2) + '%';
};
const toNum = (n) => {
    if (!n || isNaN(n))
        return '0';
    return n >= 1_000_000
        ? (n / 1_000_000).toFixed(1) + 'M'
        : n >= 1_000
            ? (n / 1_000).toFixed(1) + 'k'
            : n.toString();
};
const humanFileSize = (bytes) => {
    if (!bytes)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};
const toTime = (ms) => {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor(ms / 3600000) % 24;
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
};
export default {
    name: ['infobot'],
    help: ['infobot'],
    desc: "muestra la información del bot",
    tags: ['main'],
    register: true,
    run: async ({ conn, m }) => {
        const start = Date.now();
        const botId = conn.user.id.split(':')[0].replace('@s.whatsapp.net', '');
        const { name_bot, tipo, logo_url } = await getBotSettings(botId);
        const sessionsDir = path.join(process.cwd(), 'sessions');
        const subbotsCount = fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir).filter(d => d.startsWith('sub_')).length : 0;
        // 🔥 ACTUALIZADO: Usar bot_data JSONB
        // Obtener grupos donde este bot tiene joined = true
        const resGrupos = await db.query(`SELECT group_id, bot_data 
   FROM chats 
   WHERE is_group = true 
   AND bot_data ? $1`, [botId]);
        const gruposUnidos = resGrupos.rows.filter(r => {
            const data = r.bot_data || {};
            return data[botId]?.joined === true;
        }).length;
        // Total de grupos (todos los que tienen este bot en bot_data)
        const totalGrupos = resGrupos.rows.filter(r => {
            const data = r.bot_data || {};
            return data[botId] !== undefined;
        }).length;
        const gruposSalidos = totalGrupos - gruposUnidos;
        // 🔥 ACTUALIZADO: Chats privados
        const resPrivados = await db.query(`SELECT group_id, bot_data 
   FROM chats 
   WHERE is_group = false 
   AND bot_data ? $1`, [botId]);
        const privates = resPrivados.rows.filter(r => {
            const data = r.bot_data || {};
            return data[botId] !== undefined;
        }).length;
        const chatsTotales = totalGrupos + privates;
        const totalPlugins = getPlugins().filter(p => p?.tags).length;
        const settings = await getBotSettings(botId);
        const prefijo = await getPrefix(botId);
        const modo = settings.mode === 'public' ? 'public' : 'private';
        const jid = settings?.newsletter_jid || "120363285614743024@newsletter";
        const name = settings?.newsletter_name || "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx";
        const isActive = jid && jid !== "" && jid !== "off";
        const [{ count: totalUsers }] = (await db.query(`SELECT COUNT(*)::int FROM usuarios`)).rows;
        const [{ count: registeredUsers }] = (await db.query(`SELECT COUNT(*)::int FROM usuarios WHERE registered = true`)).rows;
        // 🔥 ACTUALIZADO: Total de grupos globales (con al menos un bot)
        const [{ count: totalChatsGlobal }] = (await db.query(`SELECT COUNT(*)::int FROM chats WHERE is_group = true AND bot_data != '{}'::jsonb AND bot_data IS NOT NULL`)).rows;
        const [{ total }] = (await db.query(`SELECT SUM(count)::int AS total FROM stats`)).rows;
        const comandosEjecutados = total || 0;
        const memoriaUso = process.memoryUsage();
        const sistema = {
            plataforma: os.platform(),
            usoRam: humanFileSize(memoriaUso.rss),
            usoCpu: getCpuUsage(),
            uptime: toTime(os.uptime() * 1000)
        };
        const latencia = Date.now() - start;
        const uptime = process.uptime() * 1000;
        const ppUrl = await fetch("https://telegra.ph/file/39fb047cdf23c790e0146.jpg");
        const img = Buffer.from(await ppUrl.arrayBuffer());
        const teks = `*≡ INFOBOT*

*INFORMACIÓN*
*▣ Grupos total:* ${totalGrupos}
*▣ Grupos unidos:* ${gruposUnidos}
*▣ Grupo salidos:* ${gruposSalidos}
*▣ Chats privado:* ${privates}
*▣ Chats totales:* ${chatsTotales}
*▣ Sub-Bots conectado:* ${subbotsCount}
*▣ Total plugins:* ${totalPlugins}
*▣ Mode:* ${modo}
*▣ Prefix:* ${prefijo}
*▣ Velocidad:* ${latencia.toFixed(4)} ms
*▣ Actividad:* ${new Date(uptime).toISOString().substr(11, 8)}

*▣ Comandos ejecutados:* ${toNum(comandosEjecutados)} / ${comandosEjecutados}
*▣ Grupos registrados:* ${toNum(totalChatsGlobal)} / ${totalChatsGlobal}
*▣ Usuarios registrados:* ${toNum(registeredUsers)} de ${toNum(totalUsers)} users totales

*≡ S E R V E R*
▣ *Servidor:* ${os.hostname()}
▣ *Plataforma:* ${sistema.plataforma}
▣ *RAM usada:* ${sistema.usoRam}
▣ *Uso de CPU:* ${sistema.usoCpu}
▣ *Uptime:* ${sistema.uptime}`;
        await conn.reply(m.chat, teks, m, {
            thumbnail: img,
            title: "INFO - BOT",
            description: `${name_bot} (${tipo})`,
            largeThumbnail: true,
            previewType: "video",
            thumbnailUrl: "https://www.instagram.com/edi504_"
        });
    }
};
