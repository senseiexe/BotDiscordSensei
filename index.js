const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const http = require('http');

// --- CONFIGURAÇÃO DO SERVIDOR PARA A RENDER ---
const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Online');
});

// Função para iniciar o servidor com tratamento de erro de porta
function startServer() {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`⚓ Porta ${PORT} aberta. Conectando ao Discord...`);
        loginBot();
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Porta ${PORT} ocupada, tentando novamente em 3s...`);
            setTimeout(() => {
                server.close();
                startServer();
            }, 3000);
        }
    });
}

// --- CONFIGURAÇÃO DO BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

function loginBot() {
    client.login(process.env.TOKEN).catch(err => {
        console.error("❌ Errow no login:", err.message);
    });
}

client.once('ready', () => {
    console.log(`🚀 SUCESSO! Logado como ${client.user.tag}`);
});

// Inicia tudo
startServer();