const { Client, GatewayIntentBits, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const http = require('http');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Contador simples (reseta se o bot reiniciar)
let ticketCount = 1;

// Servidor básico para a Render
http.createServer((req, res) => {
    res.write("Bot Online!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`✅ Bot logado como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // Comando /setup
    if (interaction.commandName === 'setup') {
        const embed = new EmbedBuilder()
            .setTitle('Central de Suporte')
            .setDescription('Clique no botão abaixo para abrir um ticket de atendimento.')
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

    // Lógica do Botão Abrir Ticket
    if (interaction.customId === 'abrir_ticket') {
        const guild = interaction.guild;
        const user = interaction.user;
        const protocol = ticketCount++;

        const channel = await guild.channels.create({
            name: `ticket-${user.username}-${protocol}`,
            type: ChannelType.GuildText,
            parent: process.env.CATEGORY_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        await interaction.reply({ content: `Ticket criado: ${channel}`, ephemeral: true });

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`Ticket #${protocol}`)
            .setDescription(`Olá ${user}, aguarde um moderador.`)
            .setColor('#00ff00');

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('fechar_ticket')
                .setLabel('Fechar Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [ticketEmbed], components: [closeButton] });
    }

    // Lógica do Botão Fechar Ticket
    if (interaction.customId === 'fechar_ticket') {
        await interaction.reply('Este ticket será fechado em 5 segundos...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

client.login(process.env.TOKEN);