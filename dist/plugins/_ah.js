export default {
    name: ["Hola"],
    help: ["Hola"],
    desc: "Responder Hola",
    tags: ["fun"],

    run: async ({ conn, m }) => {
        await m.reply("hola");
    }
};
