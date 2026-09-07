export default {
    name: ["resetlink", "revoke"],
    help: ["resetlink"],
    desc: "obtener en link del grupo",
    tags: ["group"],
    group: true,
    botAdmin: true,
    register: true,
    run: async ({ conn, m, body }) => {
        const revoke = await conn.groupRevokeInvite(m.chat);
        await m.reply(`*_Se restableció con éxito el link del grupo._*\n\n*• Link Nuevo:* ${'https://chat.whatsapp.com/' + revoke}`);
    }
};
