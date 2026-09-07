import fs from "fs";
import fuzzysort from "fuzzysort";
import path from "path";
export default {
    name: ["getplugin", "gp"],
    help: ["getplugin <nombre|add|edit|del>"],
    desc: "Ver, agregar, editar o eliminar plugins del bot.",
    tags: ["owner"],
    rowner: true,
    run: async ({ m, args, text, prefijo, cmd }) => {
        const pluginsDir = path.join(process.cwd(), "plugins");
        if (!fs.existsSync(pluginsDir))
            fs.mkdirSync(pluginsDir);
        const subcmd = args[0]?.toLowerCase();
        const pluginName = args[1]?.replace(/\.ts$/, "");
        const body = text.split("\n").slice(1).join("\n").trim();
        const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".ts"));
        const pluginList = pluginFiles.map(f => f.replace(".ts", ""));
        if (subcmd === "add") {
            if (!pluginName)
                return m.reply(`✳️ Usa:\n${prefijo + cmd} add nombre\n<codigo>`);
            if (!body)
                return m.reply("❌ Escribe el código del plugin luego del nombre.");
            const filePath = path.join(pluginsDir, `${pluginName}.ts`);
            if (fs.existsSync(filePath))
                return m.reply("⚠️ Ya existe un plugin con ese nombre.");
            fs.writeFileSync(filePath, body);
            return m.reply(`✅ Plugin *${pluginName}.ts* agregado correctamente.`);
        }
        if (subcmd === "edit") {
            if (!pluginName)
                return m.reply(`✳️ Usa:\n${prefijo + cmd} edit nombre\n<codigo>`);
            if (!body)
                return m.reply("❌ Debes incluir el código actualizado del plugin.");
            const filePath = path.join(pluginsDir, `${pluginName}.ts`);
            if (!fs.existsSync(filePath))
                return m.reply("❌ No existe ese plugin.");
            fs.writeFileSync(filePath, body);
            return m.reply(`✏️ Plugin *${pluginName}.ts* editado correctamente.`);
        }
        if (subcmd === "del") {
            if (!pluginName)
                return m.reply(`✳️ Usa:\n${prefijo + cmd} del nombre`);
            const filePath = path.join(pluginsDir, `${pluginName}.ts`);
            if (!fs.existsSync(filePath))
                return m.reply("❌ No existe ese plugin.");
            fs.unlinkSync(filePath);
            return m.reply(`🗑 Plugin *${pluginName}.ts* eliminado.`);
        }
        if (!text)
            return m.reply(`✳️ Ejemplo:\n${prefijo + cmd} sticker\n\nSubcomandos:\n- add nombre\n- edit nombre\n- del nombre`);
        const query = text.trim();
        const results = fuzzysort.go(query, pluginList);
        if (results.length === 0) {
            return m.reply(`❌ '${query}' no encontrado.\n\n📂 Plugins disponibles:\n${pluginList.map(v => "• " + v).join("\n")}`);
        }
        const match = results[0].target;
        const filePath = path.join(pluginsDir, `${match}.ts`);
        const code = fs.readFileSync(filePath, "utf-8");
        await m.reply(`🧩 *Plugin:* ${match}.ts\n\n${code.slice(0, 65536)}`);
    },
};
