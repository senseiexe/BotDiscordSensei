const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const http = require('http');

// Servidor para a Render
http.createServer((req, res) => {
    res.write("Bot Online!");
    res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// Contador de tickets (reseta ao reiniciar)
let ticketCount = 1;

client.once('ready', () => {
    console.log(`✅ SUCESSO! Logado como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    if (interaction.commandName === 'setup') {
        const embed = new EmbedBuilder()
            .setTitle('Central de Suporte')
            .setDescription('Clique abaixo para abrir um ticket.')
            .setColor('#2b2d31');

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_ticket')
                .setLabel('Abrir Ticket')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [button] });
    }

    if (interaction.customId === 'abrir_ticket') {
        try {
            const protocol = ticketCount++;
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}-${protocol}`,
                type: ChannelType.GuildText,
                parent: process.env.CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            await interaction.reply({ content: `Ticket criado: ${channel}`, ephemeral: true });

            const ticketEmbed = new EmbedBuilder()
                .setTitle(`Ticket #${protocol}`)
                .setDescription(`Olá ${interaction.user}, aguarde um moderador.`)
                .setColor('#00ff00');

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [ticketEmbed], components: [closeButton] });
        } catch (e) {
            console.error("Erro ao criar canal:", e);
        }
    }

    if (interaction.customId === 'fechar_ticket') {
        await interaction.reply('Fechando em 5 segundos...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

// 1. Abre o servidor primeiro para a Render liberar a rede
const server = http.createServer((req, res) => {
    res.write("Bot Online!");
    res.end();
});

server.listen(process.env.PORT || 3000, () => {
    console.log("⚓ Porta liberada pela Render. Iniciando login no Discord...");
    
    // 2. Tenta o login APÓS a porta estar aberta
    client.login(process.env.TOKEN)
        .then(() => console.log("🚀 CONEXÃO ESTABELECIDA!"))
        .catch(err => console.error("❌ ERRO NO LOGIN:", err.message));
});