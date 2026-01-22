
const token = process.env.TG_BOT_TOKEN;
const chatId = process.env.TG_CHAT_ID;

export async function tgSend(text: string) {
    if (!token || !chatId) return; // тихо пропускаем, если не настроено

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML"
            })
        });

        if (!response.ok) {
            console.error(`Telegram API error: ${response.statusText}`);
        }
    } catch (e) {
        console.error(`Failed to send Telegram message: ${(e as Error).message}`);
    }
}
