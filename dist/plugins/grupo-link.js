export default {
    name: ["link", "linkgroup"],
    help: ["link"],
    desc: "obtener en link del grupo",
    tags: ["group"],
    group: true,
    botAdmin: true,
    register: true,
    run: async ({ conn, m, body }) => {
        const group = m.chat;
        m.reply('https://chat.whatsapp.com/' + await conn.groupInviteCode(group));
    }
};
