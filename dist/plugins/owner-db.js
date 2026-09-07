import { db } from "../lib/db.js";
export default {
    name: ["db"],
    help: ["db <accion> [args]"],
    desc: "Administrar base de datos",
    tags: ["owner"],
    rowner: true,
    run: async ({ conn, m, args, prefijo }) => {
        const accion = (args[0] || "").toLowerCase();
        const extras = args.slice(1);
        if (accion === "info") {
            try {
                const tablas = await db.query(`
      SELECT 
        c.relname AS table_name,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
        c.reltuples::bigint AS rows
      FROM pg_class c
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `);
                const total = await db.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS total
    `);
                let msg = `📊 *Información de la Base de Datos*\n\n`;
                for (const row of tablas.rows) {
                    msg += `• ${row.table_name} → ${row.rows} filas | ${row.size}\n`;
                }
                msg += `\n💾 *Tamaño total:* ${total.rows[0].total}`;
                return m.reply(msg);
            }
            catch (e) {
                return m.reply("❌ Error al consultar DB: " + e);
            }
        }
        if (accion === "crear") {
            if (extras.length === 0)
                return m.reply(`✳️ Usa:\n${prefijo}db crear <tabla1,tabla2,...>`);
            const tablas = extras.join(" ").split(",");
            let out = `📦 *Creando tablas:*\n`;
            for (const t of tablas) {
                try {
                    await db.query(`CREATE TABLE IF NOT EXISTS ${t.trim()} (id SERIAL PRIMARY KEY);`);
                    out += `✅ ${t}\n`;
                }
                catch (e) {
                    out += `❌ ${t} → ${e}\n`;
                }
            }
            return m.reply(out);
        }
        if (accion === "eliminar") {
            if (extras.length === 0)
                return m.reply(`✳️ Usa:\n${prefijo}db eliminar <tabla1,tabla2,...>`);
            const tablas = extras.join(" ").split(",");
            let out = `🗑️ *Eliminando tablas:*\n`;
            for (const t of tablas) {
                try {
                    await db.query(`DROP TABLE IF EXISTS ${t.trim()} CASCADE;`);
                    out += `✅ ${t}\n`;
                }
                catch (e) {
                    out += `❌ ${t} → ${e}\n`;
                }
            }
            return m.reply(out);
        }
        if (accion === "ver") {
            const tabla = extras[0];
            if (!tabla)
                return m.reply(`✳️ Usa:\n${prefijo}db ver usuarios`);
            try {
                const res = await db.query(`SELECT * FROM ${tabla} LIMIT 20`);
                if (res.rowCount === 0)
                    return m.reply(`❌ La tabla *${tabla}* está vacía.`);
                let msg = `📋 *Contenido de ${tabla}* (máx 20 filas)\n\n`;
                for (const row of res.rows) {
                    msg += `🆔 ${row.id || "(sin id)"}\n`;
                    for (const [k, v] of Object.entries(row)) {
                        if (k !== "id")
                            msg += `  • ${k}: ${v ?? "null"}\n`;
                    }
                    msg += `\n`;
                }
                return m.reply(msg);
            }
            catch (e) {
                return m.reply("❌ Error mostrando tabla: " + e);
            }
        }
        if (accion === "duplicados") {
            try {
                // Buscar lids que tengan más de una fila asociada en `usuarios`
                const dupLids = await db.query(`
      SELECT lid, COUNT(*) AS cnt
      FROM usuarios
      WHERE lid IS NOT NULL
      GROUP BY lid
      HAVING COUNT(*) > 1
    `);
                if (dupLids.rows.length === 0) {
                    return m.reply("✅ No se encontraron usuarios duplicados.");
                }
                let out = `🧹 *Limpiando duplicados (${dupLids.rows.length} conjuntos)*\n\n`;
                let sinResolver = [];
                for (const { lid } of dupLids.rows) {
                    const grupo = await db.query(`SELECT * FROM usuarios WHERE lid = $1 ORDER BY 
           (id LIKE '%@s.whatsapp.net') DESC
        `, [lid]);
                    const rows = grupo.rows;
                    if (rows.length <= 1)
                        continue;
                    // Fila principal: SIEMPRE preferimos una con id numérico real (@s.whatsapp.net).
                    const conNumero = rows.find(r => r.id?.endsWith("@s.whatsapp.net"));
                    if (!conNumero) {
                        sinResolver.push(lid);
                        continue;
                    }
                    const principal = conNumero;
                    const resto = rows.filter(r => r.id !== principal.id);
                    // Fusionar TODAS las columnas de forma genérica
                    const merged = { ...principal };
                    for (const row of resto) {
                        for (const key of Object.keys(row)) {
                            if (key === "id")
                                continue;
                            const actual = merged[key];
                            const esVacio = actual === null || actual === undefined || actual === "";
                            if (esVacio && row[key] !== null && row[key] !== undefined && row[key] !== "") {
                                merged[key] = row[key];
                            }
                        }
                    }
                    const cols = Object.keys(merged).filter(k => k !== "id");
                    const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
                    const values = cols.map(c => merged[c]);
                    await db.query(`UPDATE usuarios SET ${setClause} WHERE id = $1`, [principal.id, ...values]);
                    // Borrar las filas sobrantes (incluye las que tenían id = @lid)
                    const idsSobrantes = resto.map(r => r.id);
                    if (idsSobrantes.length > 0) {
                        await db.query(`DELETE FROM usuarios WHERE id = ANY($1)`, [idsSobrantes]);
                    }
                    out += `➥ lid ${lid.split("@")[0]} → ${rows.length} filas → quedó: ${principal.id}\n`;
                }
                if (sinResolver.length > 0) {
                    out += `\n⚠️ *Sin resolver (${sinResolver.length})* — no tienen id numérico en ninguna fila:\n`;
                    for (const l of sinResolver)
                        out += `• ${l}\n`;
                }
                // ✅ ELIMINAR DIRECTAMENTE las filas con id=@lid sin duplicado
                const sueltasConLid = await db.query(`
      SELECT id FROM usuarios WHERE id LIKE '%@lid'
    `);
                if (sueltasConLid.rows.length > 0) {
                    const idsToDelete = sueltasConLid.rows.map(r => r.id);
                    await db.query(`DELETE FROM usuarios WHERE id = ANY($1)`, [idsToDelete]);
                    out += `\n🧹 *${sueltasConLid.rows.length} filas con id=@lid ELIMINADAS*\n`;
                }
                return m.reply(out);
            }
            catch (e) {
                return m.reply("❌ Error limpiando duplicados: " + e);
            }
        }
        if (accion === "optimizar") {
            try {
                // VACUUM FULL (optimiza espacio)
                await db.query("VACUUM FULL;");
                // REINDEX SCHEMA public (no requiere ser dueño de la DB)
                await db.query("REINDEX SCHEMA public;");
                return m.reply("⚡ DB optimizada y reindexada correctamente.\n\n" +
                    "• VACUUM FULL completado\n" +
                    "• REINDEX SCHEMA public completado");
            }
            catch (e) {
                return m.reply("❌ Error optimizando: " + e.message);
            }
        }
        return m.reply(`✳️ Comandos disponibles:
${prefijo}db info
${prefijo}db crear tabla1,tabla2
${prefijo}db eliminar tabla1,tabla2
${prefijo}db ver usuarios 
${prefijo}db duplicados
${prefijo}db optimizar`);
    }
};
