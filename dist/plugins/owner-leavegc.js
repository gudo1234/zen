export default {
    name: ["salir", "leavegc", "salirdelgrupo", "leave"],
    help: ["leave"],
    tags: ["owner"],
    desc: "Para sacar el bot del grupo",
    owner: true,
    register: true,
    run: async ({ conn, m, args, text, prefijo, cmd }) => {
        let id = text ? text : m.chat;
        await m.reply('*𝐄𝐥 𝐁𝐨𝐭 𝐚𝐛𝐚𝐧𝐝𝐨𝐧𝐚 𝐞𝐥 𝐠𝐫𝐮𝐩𝐨, 𝐜𝐡𝐚𝐮 👋*');
        await conn.groupLeave(id);
    }
};
