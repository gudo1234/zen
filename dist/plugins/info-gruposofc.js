export default {
    name: ["grupos", "linkgc"],
    help: ["grupos"],
    desc: "Muestra los grupos oficiales del bot.",
    tags: ["main"],
    register: true,
    run: async ({ conn, m, body }) => {
        let texto = `*\`✅ BIENVENIDO A LOS GRUPOS OFICIALES\`*

  1) https://chat.whatsapp.com/GgNZnyr2aMqHcF769Vp8B5?mode=gi_t
  
  2) https://chat.whatsapp.com/KDBt6S54riRCIpSZspkxhg?mode=gi_t

➤ Grupo del Colaboracion LoliBot & GataBot-MD
https://chat.whatsapp.com/Ej5AUrpmYnJKYtEa6YMwK6

➤ Grupo soporte para responder a tu dudas/sugerencia/etc
https://chat.whatsapp.com/GyI0D4BCDS8DRQmRYfKSo4?mode=gi_t
 
➤ Infomarte sobre las nuevas actualizaciones/novedades, etc aqui:
https://whatsapp.com/channel/0029VagJ2FF4CrfrS8BoLW2b

 ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈

*\`GRUPOS DE AMISTADES\`*

๋࣭ 𝑇ℎ𝑒 𝑊𝑜𝑟𝑙𝑑 (｡•̀ᴗ-)✧💛
https://chat.whatsapp.com/Csf3E6f2teh2wy3LXfbYRS?mode=ems_copy_c`.trim();
        m.reply(texto);
        //conn.fakeReply(m.chat, info, '0@s.whatsapp.net', '𝙏𝙝𝙚-𝙇𝙤𝙡𝙞𝘽𝙤𝙩-𝙈𝘿', 'status@broadcast')
    }
};
