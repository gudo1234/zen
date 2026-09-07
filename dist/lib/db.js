import { Pool } from "pg";
import NodeCache from "node-cache";
export const db = new Pool({
    connectionString: process.env.POSTGRES_URL
});
export const msgStore = new NodeCache({ stdTTL: 120, checkperiod: 60, useClones: false });
export async function initDB() {
    await db.query(`CREATE TABLE IF NOT EXISTS usuarios (
        lid TEXT PRIMARY KEY,
        id TEXT
      );
`);
    const columnasUsuarios = [
        ['nombre', 'TEXT'],
        ['name', 'TEXT'],
        ['num', 'TEXT'],
        //['lid', 'TEXT'],
        ['premium', 'BOOLEAN DEFAULT false'],
        ['premium_until', 'BIGINT DEFAULT 0'],
        ['registered', 'BOOLEAN DEFAULT false'],
        ['reg_time', 'TIMESTAMP'],
        ['edad', 'INTEGER'],
        ['gender', 'TEXT'],
        ['birthday', 'DATE'],
        ['limite', 'INTEGER DEFAULT 10'],
        ['money', 'INTEGER DEFAULT 100'],
        ['exp', 'INTEGER DEFAULT 0'],
        ['banco', 'INTEGER DEFAULT 0'],
        ['marry', 'TEXT DEFAULT NULL'],
        ['marry_request', 'TEXT DEFAULT NULL'],
        ['lastclaim', 'BIGINT DEFAULT 0'],
        ['dailystreak', 'BIGINT DEFAULT 0'],
        ['lastwork', 'BIGINT DEFAULT 0'],
        ['lastmiming', 'BIGINT DEFAULT 0'],
        ['wait', 'BIGINT DEFAULT 0'],
        ['lastcofre', 'BIGINT DEFAULT 0'],
        ['lastrob', 'BIGINT DEFAULT 0'],
        ['lastslut', 'BIGINT DEFAULT 0'],
        ['crime', 'BIGINT DEFAULT 0'],
        ['level', 'INTEGER DEFAULT 0'],
        ['role', "TEXT DEFAULT 'novato'"],
        ['sticker_packname', 'TEXT'],
        ['discord_id', 'TEXT'],
        ['discord_verified', 'BOOLEAN DEFAULT false'],
        ['discord_verified_at', 'TIMESTAMP'],
        ['sticker_author', 'TEXT'],
        ['warn_status', 'INTEGER DEFAULT 0'],
        ['razon_ban', 'TEXT'],
        ['avisos_ban', 'INTEGER DEFAULT 0'],
        ['banned', 'BOOLEAN DEFAULT false'],
        ['banned_reason', 'TEXT DEFAULT NULL'],
        ['ban_warnings', 'INTEGER DEFAULT 0'],
        ['ry_time', 'BIGINT DEFAULT 0'],
        ['timevot', 'BIGINT DEFAULT 0'],
        ['serial_number', 'TEXT'],
    ];
    for (const [columna, tipo] of columnasUsuarios) {
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ${columna} ${tipo}`);
    }
    await db.query(`CREATE TABLE IF NOT EXISTS chats (
      group_id TEXT PRIMARY KEY
    );
`);
    const columnasGrupos = [
        ["welcome", "BOOLEAN DEFAULT true"],
        ["bye", "BOOLEAN DEFAULT false"],
        ["antilink", "BOOLEAN DEFAULT false"],
        ["antilink2", "BOOLEAN DEFAULT false"],
        ['antilink_prohibited', "JSONB DEFAULT '[\"chat.whatsapp.com\", \"whatsapp.com/channel\"]'::jsonb"],
        ['antilink_allowed', "JSONB DEFAULT '[]'::jsonb"],
        ['antilink_warn', 'INTEGER DEFAULT 0'],
        ['modoadmin', 'BOOLEAN DEFAULT false'],
        ["auto_approve", "BOOLEAN DEFAULT false"],
        ["antifake", "BOOLEAN DEFAULT false"],
        [
            "antifake_prefixes",
            `TEXT[] DEFAULT ARRAY[
    '+91', '+92', '+222', '+93', '+265', '+213', '+225', '+240', '+241',
    '+61', '+249', '+62', '+966', '+229', '+244', '+40', '+49', '+20',
    '+963', '+967', '+234', '+256', '+243', '+210', '+249', '+212',
    '+971', '+974', '+968', '+965', '+962', '+961', '+964', '+970'
  ]::TEXT[]`
        ],
        ['detect', 'BOOLEAN DEFAULT true'],
        ['antistatus', 'BOOLEAN DEFAULT false'],
        ["antinsfw", "BOOLEAN DEFAULT false"],
        ["nsfw_warn_limit", "INTEGER DEFAULT 3"],
        ["nsfw_types", "TEXT[] DEFAULT ARRAY['nsfw', 'gore']"],
        ['photowelcome', 'BOOLEAN DEFAULT false'],
        ['photobye', 'BOOLEAN DEFAULT false'],
        ['sWelcome', 'TEXT'],
        ['sBye', 'TEXT'],
        ['sPromote', 'TEXT'],
        ['sDemote', 'TEXT'],
        ['sannounce', 'TEXT'],
        ['srestrict', 'TEXT'],
        ['ssubject', 'TEXT'],
        ['sdesc', 'TEXT'],
        ['sinvite', 'TEXT'],
        ['santifakemsg', 'TEXT'],
        ['sAutorespond', 'TEXT'],
        ['autoresponder', 'BOOLEAN DEFAULT true'],
        ['banned', 'BOOLEAN DEFAULT false'],
        ['memory_ttl', 'INTEGER DEFAULT 86400'],
        ['primary_bot', "TEXT DEFAULT NULL"],
        ['is_group', 'BOOLEAN DEFAULT false'],
        ['joined', 'BOOLEAN DEFAULT false'],
        ['warn_limit', 'INTEGER DEFAULT 3'],
        ['bot_data', "JSONB DEFAULT '{}'::jsonb"],
        ['muted_users', 'JSONB DEFAULT \'[]\'::jsonb'],
        ['expired', 'BIGINT DEFAULT 0']
    ];
    for (const [columna, tipo] of columnasGrupos) {
        await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS ${columna} ${tipo}`);
    }
    // Prefijos por bot
    await db.query(`
    CREATE TABLE IF NOT EXISTS bot_prefixes (
      bot_id TEXT PRIMARY KEY,
      prefix TEXT
    );
  `);
    //sub bots
    await db.query(`CREATE TABLE IF NOT EXISTS bot_settings (
  bot_id TEXT PRIMARY KEY
);`);
    const columnasSubbots = [
        ["mode", "TEXT DEFAULT 'public'"],
        ["anti_private", "BOOLEAN DEFAULT false"],
        ["anti_call", "BOOLEAN DEFAULT false"],
        ["owners", "JSONB DEFAULT '[]'::jsonb"],
        ["name_bot", "TEXT DEFAULT 'ᴢᴇɴᴛʀɪx-ʙᴏᴛ'"],
        ["logo_url", "TEXT DEFAULT 'https://telegra.ph/file/39fb047cdf23c790e0146.jpg'"],
        ['privacy', 'BOOLEAN DEFAULT false'],
        ["server", "TEXT DEFAULT NULL"],
        ["tipo", "TEXT DEFAULT NULL"],
        ["newsletter_jid", "TEXT DEFAULT '120363285614743024@newsletter'"],
        ["newsletter_name", "TEXT DEFAULT 'ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx'"],
        ["emoji_set", "JSONB DEFAULT '{}'::jsonb"],
        ["system_msgs", "JSONB DEFAULT '{}'::jsonb"],
        ["menu_type", "TEXT DEFAULT 'image'"],
        ["menu_media", "TEXT DEFAULT 'https://telegra.ph/file/39fb047cdf23c790e0146.jpg'"],
        ["menu_text", "TEXT DEFAULT ''"],
        ["banned", "BOOLEAN DEFAULT false"],
        ["prestar", "BOOLEAN DEFAULT false"],
        ['registro', 'BOOLEAN DEFAULT true'],
        ["global_ban_exempt_groups", "TEXT[] DEFAULT '{}'"],
        ["global_ban_exempt_users", "TEXT[] DEFAULT '{}'"]
    ];
    for (const [columna, tipo] of columnasSubbots) {
        await db.query(`ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS ${columna} ${tipo}`);
    }
    //antilink 
    await db.query(`
  CREATE TABLE IF NOT EXISTS antilink_warns (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    warns INTEGER DEFAULT 1,
    PRIMARY KEY (group_id, user_id)
  );
`);
    //report
    await db.query(`
  CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    mensaje TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enviado BOOLEAN DEFAULT false,
    tipo TEXT DEFAULT 'reporte'
  );
`);
    //carácter 
    await db.query(`
  CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY
  );
`);
    const columnasCharacters = [
        ['name', 'TEXT NOT NULL'],
        ['url', 'TEXT NOT NULL'],
        ['tipo', 'TEXT'],
        ['anime', 'TEXT'],
        ['rareza', 'TEXT'],
        ['price', 'INTEGER NOT NULL'],
        ['previous_price', 'INTEGER'],
        ['claimed_by', 'TEXT'],
        ['for_sale', 'BOOLEAN DEFAULT false'],
        ['seller', 'TEXT'],
        ['votes', 'INTEGER DEFAULT 0'],
        ['last_removed_time', 'BIGINT']
    ];
    for (const [columna, tipo] of columnasCharacters) {
        await db.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS ${columna} ${tipo}`);
    }
    await db.query(`
  CREATE TABLE IF NOT EXISTS nsfw_warnings (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    warns INTEGER DEFAULT 0,
    last_reason TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
  );
`);
    //stars
    await db.query(`
      CREATE TABLE IF NOT EXISTS stats (
        command TEXT PRIMARY KEY,
        count INTEGER DEFAULT 1
      );
    `);
    //sticker
    await db.query(`
  CREATE TABLE IF NOT EXISTS sticker_packs (
    id SERIAL PRIMARY KEY
  );
`);
    const columnas = [
        ["name", "TEXT NOT NULL"],
        ["owner_id", "TEXT NOT NULL"],
        ["owner_name", "TEXT"],
        ["public", "BOOLEAN DEFAULT true"],
        ["max_stickers", "INTEGER DEFAULT 50"],
        ["created_at", "TIMESTAMP DEFAULT NOW()"]
    ];
    for (const [columna, tipo] of columnas) {
        await db.query(`
    ALTER TABLE sticker_packs
    ADD COLUMN IF NOT EXISTS ${columna} ${tipo}
  `);
    }
    await db.query(`
  CREATE TABLE IF NOT EXISTS sticker_pack_items (
  id SERIAL PRIMARY KEY,
  pack_id INTEGER REFERENCES sticker_packs(id) ON DELETE CASCADE,
  sticker BYTEA NOT NULL,
  sticker_sha256 BYTEA NOT NULL,
  emojis TEXT[] DEFAULT ARRAY[''],
  created_at TIMESTAMP DEFAULT NOW()
);
`);
    await db.query(`
  CREATE INDEX IF NOT EXISTS idx_pack_items_sha
ON sticker_pack_items(pack_id, sticker_sha256);
`);
    //warn 
    await db.query(`
  CREATE TABLE IF NOT EXISTS warn_status (
    user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    warns INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, group_id)
  );
`);
    //chat memoria
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_memory (
        chat_id TEXT PRIMARY KEY,
        history JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // contador de mensajes por grupo
    await db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
  );
`);
    // tempmail por usuario
    await db.query(`
  CREATE TABLE IF NOT EXISTS tempmail_users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    deleted_in TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`);
    //tictac
    await db.query(`
  CREATE TABLE IF NOT EXISTS tictac_salas (
    nombre TEXT PRIMARY KEY,
    creador TEXT NOT NULL,
    jugador2 TEXT,
    chat_id TEXT NOT NULL,
    estado TEXT DEFAULT 'esperando',
    created_at TIMESTAMP DEFAULT NOW()
  );
`);
    //addcmd
    await db.query(`
  CREATE TABLE IF NOT EXISTS custom_commands (
    id SERIAL PRIMARY KEY,
    bot_id TEXT NOT NULL,
    group_id TEXT,
    cmd TEXT NOT NULL,
    UNIQUE (bot_id, group_id, cmd)
  );
`);
    const columnasCmd = [
        ['type', "TEXT DEFAULT 'text'"],
        ['text', 'TEXT'],
        ['url', 'TEXT'],
        ['sticker_hash', 'TEXT'],
        ['is_global', 'BOOLEAN DEFAULT false'],
        ['created_by', 'TEXT'],
        ['created_at', 'TIMESTAMP DEFAULT NOW()'],
        ['updated_at', 'TIMESTAMP DEFAULT NOW()']
    ];
    for (const [columna, tipo] of columnasCmd) {
        await db.query(`
    ALTER TABLE custom_commands
    ADD COLUMN IF NOT EXISTS ${columna} ${tipo}
  `);
    }
    //ventas
    await db.query(`
  CREATE TABLE IF NOT EXISTS ventas (
    group_id TEXT,
    command TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    content TEXT,
    content_text TEXT,
    created_by TEXT,
    global BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, command)
  );
`);
    //freefire
    await db.query(`
  CREATE TABLE IF NOT EXISTS freefire (
    id SERIAL PRIMARY KEY,
    group_id TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    creator TEXT NOT NULL,
    players TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);
    //prem
    await db.query(`CREATE TABLE IF NOT EXISTS subbot_instances (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL,
  phone TEXT,
  plan TEXT DEFAULT 'free',
  token TEXT,
  ptero_server_id TEXT,
  session_id TEXT NOT NULL UNIQUE,
  session_path TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
`);
    //tokenprem
    await db.query(`CREATE TABLE IF NOT EXISTS premium_tokens (
  token TEXT PRIMARY KEY
);`);
    const columnasTokenPrem = [
        ["used", "BOOLEAN DEFAULT false"],
        ["plan", "TEXT DEFAULT 'premium'"],
        ["days", "INTEGER DEFAULT 30"],
        ["max_uses", "INTEGER DEFAULT 1"],
        ["used_count", "INTEGER DEFAULT 0"],
        ["created_by", "TEXT"],
        ["used_by", "TEXT"],
        ["created_at", "TIMESTAMP DEFAULT NOW()"],
        ["used_at", "TIMESTAMP"],
        ["active", "BOOLEAN DEFAULT true"],
        ["duration_ms", "BIGINT"],
        ["expires_at", "TIMESTAMP"]
    ];
    for (const [columna, tipo] of columnasTokenPrem) {
        await db.query(`ALTER TABLE premium_tokens ADD COLUMN IF NOT EXISTS ${columna} ${tipo}`);
    }
    await db.query(`
  CREATE TABLE IF NOT EXISTS telegram_chats (
    chat_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT,
    username TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
  );
`);
}
export async function generateToken() {
    try {
        const token = Math.random().toString(36).substring(2, 35).toUpperCase();
        await db.query("INSERT INTO premium_tokens (token) VALUES ($1)", [token]);
        return token;
    }
    catch (err) {
        console.error("❌ Error generando token:", err);
        throw err; // O maneja
    }
}
export async function generateTokenWithTime(tiempo) {
    const token = Math.random().toString(36).substring(2, 35).toUpperCase();
    let duracionMs = 0;
    if (tiempo.endsWith("m") && !tiempo.endsWith("w"))
        duracionMs = parseInt(tiempo) * 60000; // minutos
    else if (tiempo.endsWith("h"))
        duracionMs = parseInt(tiempo) * 3600000; // horas
    else if (tiempo.endsWith("d"))
        duracionMs = parseInt(tiempo) * 86400000; // días
    else if (tiempo.endsWith("w"))
        duracionMs = parseInt(tiempo) * 7 * 86400000; // semanas
    else if (tiempo.endsWith("M"))
        duracionMs = parseInt(tiempo) * 30 * 86400000; // meses
    else
        throw new Error("Formato inválido (usa 30m, 2h, 3d, 1w, 1M)");
    const expiresAt = new Date(Date.now() + duracionMs);
    await db.query("INSERT INTO premium_tokens (token, expires_at, duration) VALUES ($1, $2, $3)", [
        token,
        expiresAt.toISOString(),
        tiempo
    ]);
    return token;
}
export async function validateToken(token) {
    try {
        const res = await db.query("SELECT used FROM premium_tokens WHERE token = $1", [token.toUpperCase()]); // Normaliza a upper
        if (res.rowCount === 0)
            return false;
        if (res.rows[0].used)
            return false;
        //  await db.query("UPDATE premium_tokens SET used = true WHERE token = $1", [token.toUpperCase()]);
        return true;
    }
    catch (err) {
        console.error("❌ Error validando token:", err);
        return false;
    }
}
// Obtener configuración de un bot
export async function getBotSettings(botId) {
    const res = await db.query("SELECT * FROM bot_settings WHERE bot_id = $1 LIMIT 1", [botId]);
    if (res.rows[0])
        return res.rows[0];
    return {
        bot_id: botId,
        mode: 'public',
        anti_private: false,
        anti_call: false,
        owners: [],
        name_bot: 'ᴢᴇɴᴛʀɪx-ʙᴏᴛ',
        logo_url: 'https://telegra.ph/file/39fb047cdf23c790e0146.jpg',
        privacy: false,
        prestar: false,
        registro: true,
        tipo: null,
        server: null,
        newsletter_jid: '120363285614743024@newsletter',
        newsletter_name: 'ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx',
        menu_type: 'image',
        menu_media: 'https://telegra.ph/file/39fb047cdf23c790e0146.jpg',
        menu_text: '',
        emoji_set: { error: "❌", ok: "✅", warn: "⚠️", load: "⌛", currency_name: "Diamante(s)",
            currency_emoji: "💎" },
        system_msgs: {
            admin: "Solo los *admins* del grupo pueden usar este comando.",
            group: "¿Estos es un grupos?, Este comando solo funciona en *grupos* bobo",
            private: "Este comando solo puede usarse *Al privados* del bot.",
            owner: "Solo el *dueño del bot* puede usar este comando.",
            error: "```OCURRIO UN ERROR```\n\n> *Reporta el siguiente error a mi creador con el comando:* #report",
            warn: "⚠️ Cuidado, revisa lo que has enviado.",
            success: "✅ Completado exitosamente",
            example: "📌 Ejemplo: /comando argumento",
            limit: "⏳ Espera antes de volver a usar este comando.",
        }
    };
}
// Guardar (actualizar) configuración de un bot
export async function setBotSettings(botId, data) {
    const fields = Object.keys(data);
    if (fields.length === 0)
        return;
    // 🔥 CONVERTIR owners a JSON si es array/objeto
    const processedData = { ...data };
    if (processedData.owners !== undefined && typeof processedData.owners !== 'string') {
        processedData.owners = JSON.stringify(processedData.owners);
    }
    const cols = fields.join(", ");
    const placeholders = fields.map((_, i) => `$${i + 2}`).join(", ");
    const updates = fields.map((f) => `${f} = EXCLUDED.${f}`).join(", ");
    const values = [botId, ...fields.map((f) => processedData[f])];
    await db.query(`INSERT INTO bot_settings (bot_id, ${cols})
     VALUES ($1, ${placeholders})
     ON CONFLICT (bot_id) DO UPDATE SET ${updates}`, values);
}
export async function getPrefix(botId) {
    try {
        const res = await db.query("SELECT prefix FROM bot_prefixes WHERE bot_id = $1 LIMIT 1", [botId]);
        if (res.rows.length > 0 && res.rows[0].prefix) {
            return res.rows[0].prefix;
        }
        const settings = await getBotSettings(botId);
        let defaultPrefix = null;
        switch (settings.tipo) {
            case "main":
                defaultPrefix = "/";
                break;
            case "subbot":
                defaultPrefix = "*";
                break;
            case "premium":
                defaultPrefix = "!";
                break;
        }
        await db.query(`
  INSERT INTO bot_prefixes (bot_id, prefix)
  VALUES ($1, $2)
  ON CONFLICT (bot_id) DO UPDATE SET prefix = EXCLUDED.prefix
`, [botId, defaultPrefix]);
        return defaultPrefix;
    }
    catch (err) {
        console.error("❌ Error al obtener prefijo:", err);
        return "/";
    }
}
export async function setPrefix(botId, prefix) {
    await db.query(`INSERT INTO bot_prefixes (bot_id, prefix) VALUES ($1, $2)
     ON CONFLICT (bot_id) DO UPDATE SET prefix = $2`, [botId, prefix]);
}
