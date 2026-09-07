import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let plugins = [];
let watching = false;
// 📥 Cargar todos los plugins de la carpeta /plugins
export async function loadPlugins() {
    const dir = path.join(__dirname, "../plugins");
    plugins = [];
    for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".ts") && !file.endsWith(".js"))
            continue;
        const filePath = path.join(dir, file);
        const fileUrl = `file://${filePath}?update=${Date.now()}`; // evita caché
        try {
            const mod = await import(fileUrl);
            const plugin = mod.default || mod;
            plugins.push(plugin);
        }
        catch (e) {
            console.error(`❌ Error cargando plugin ${file}:`, e);
        }
    }
    if (!watching)
        watchPluginFolder(dir);
    console.log(`🔁 Plugins recargados (${plugins.length})`);
    return plugins;
}
// 👀 Watcher automático: recarga al detectar cambios
function watchPluginFolder(dir) {
    watching = true;
    fs.watch(dir, async (event, filename) => {
        if (!filename || (!filename.endsWith(".js") && !filename.endsWith(".ts")))
            return;
        console.log(`📂 Cambio detectado en plugin: ${filename} → recargando...`);
        await loadPlugins();
    });
}
// 📤 Obtener la lista actual de plugins
export function getPlugins() {
    return plugins;
}
// 🔎 Buscar un plugin sin ejecutarlo
export function getPlugin(cmd) {
    return plugins.find(p => {
        if (typeof p.name === "string" && p.name.toLowerCase() === cmd)
            return true;
        if (Array.isArray(p.name) && p.name.includes(cmd))
            return true;
        if (Array.isArray(p.command) && p.command.includes(cmd))
            return true;
        if (p.command instanceof RegExp && p.command.test(cmd))
            return true;
        return false;
    });
}
// 🛑 Before hooks
export async function runBefore(m, ctx) {
    for (const plugin of plugins) {
        if (typeof plugin.before === "function") {
            try {
                const stop = await plugin.before(m, ctx);
                if (stop)
                    return true;
            }
            catch (e) {
                console.error(`❌ Error en before ${plugin.name}:`, e);
            }
        }
    }
    return false;
}
// ▶️ Ejecutar comando
export async function runCommand(cmd, ctx) {
    const plugin = plugins.find(p => {
        if (typeof p.name === "string" && p.name.toLowerCase() === cmd)
            return true;
        if (Array.isArray(p.name) && p.name.includes(cmd))
            return true;
        if (Array.isArray(p.command) && p.command.includes(cmd))
            return true;
        if (p.command instanceof RegExp && p.command.test(cmd))
            return true;
        return false;
    });
    if (plugin?.run) {
        try {
            await plugin.run(ctx);
        }
        catch (e) {
            console.error(`❌ Error en comando ${plugin.name}:`, e);
        }
    }
}
// ✅ After hooks
export async function runAfter(m, ctx) {
    for (const plugin of plugins) {
        if (typeof plugin.after === "function") {
            try {
                await plugin.after(m, ctx);
            }
            catch { }
        }
    }
}
