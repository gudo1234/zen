import { webp2png } from '../lib/converter.js';
export default {
    name: ['toimg', 'jpg', 'img'],
    help: ['toimg'],
    desc: 'Convierte un sticker en imagen',
    tags: ['convertidor'],
    register: true,
    run: async ({ conn, m, prefijo, cmd }) => {
        const notStickerMessage = `*${m.e.warn} 𝐑𝐞𝐬𝐩𝐨𝐧𝐝𝐞 𝐚 𝐮𝐧 𝐬𝐭𝐢𝐜𝐤𝐞𝐫 𝐪𝐮𝐞 𝐝𝐞𝐬𝐞𝐞 𝐜𝐨𝐧𝐯𝐞𝐫𝐭𝐢𝐫 𝐞𝐧 𝐢𝐦𝐚𝐠𝐞𝐧 𝐜𝐨𝐧 𝐞𝐥 𝐬𝐢𝐠𝐮𝐢𝐞𝐧𝐭𝐞 𝐜𝐨𝐦𝐚𝐧𝐝𝐨:* ${prefijo + cmd}`;
        if (!m.quoted)
            return m.reply(notStickerMessage);
        const q = m.quoted;
        const mime = q?.mimetype || '';
        if (!mime.includes('webp'))
            return m.reply(notStickerMessage);
        m.reply(`Euu flaco 🥴\n\n> *Convirtiendo tu Sticker a Imagen 🔄*`);
        const media = await q.download();
        const out = await webp2png(media).catch(() => null) || Buffer.alloc(0);
        await conn.sendFile(m.chat, out, 'sticker.png', null, m);
    }
};
