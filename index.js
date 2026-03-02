const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const http = require('http');

// --- MANTER KOYEB ONLINE ---
const PORT = process.env.PORT || 8000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Gerente Direto Online!');
}).listen(PORT, '0.0.0.0');

// --- CONFIGURAÇÃO DO BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.Reaction]
});

// --- ANTI-CRASH (IMPEDE O BOT DE CAIR POR ERROS DE API) ---
process.on('unhandledRejection', (reason, promise) => { console.error('Erro detectado:', reason); });
process.on('uncaughtException', (err, origin) => { console.error('Exceção detectada:', err); });

client.once('clientReady', (c) => {
    console.log(`🚀 SUCESSO! Logado como ${c.user.tag}`);
    
    const commands = [
        { name: 'setup', description: 'Envia a mensagem de tickets' },
        { name: 'verificacao', description: 'Cria o botão de verificação' },
        { name: 'say', description: 'Fale pelo bot', options: [{ name: 'mensagem', type: 3, description: 'O que dizer', required: true }] },
        { name: 'limpar', description: 'Apaga mensagens do chat', options: [{ name: 'quantidade', type: 4, description: 'Qtd (1-100)', required: true }] },
        { name: 'enquete', description: 'Cria uma enquete com votação', options: [{ name: 'pergunta', type: 3, description: 'A pergunta', required: true }] },
        { 
            name: 'banir', 
            description: 'Bane um membro', 
            options: [
                { name: 'usuario', type: 6, description: 'Membro a banir', required: true },
                { name: 'motivo', type: 3, description: 'Motivo do banimento', required: false }
            ]
        }
    ];
    
    client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    
    // --- COMANDOS DE BARRA ---
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const embed = new EmbedBuilder().setTitle('🎫 Central de Suporte').setDescription('Clique abaixo para abrir um ticket.').setColor('#5865F2');
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩'));
            await interaction.reply({ embeds: [embed], components: [btn] });
        }

        if (commandName === 'verificacao') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const embed = new EmbedBuilder().setTitle('🛡️ Verificação').setDescription('Clique no botão para liberar seu acesso ao servidor.').setColor('#2ecc71');
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_verificar').setLabel('Me Verificar').setStyle(ButtonStyle.Success).setEmoji('✅'));
            await interaction.reply({ embeds: [embed], components: [btn] });
        }

        if (commandName === 'say') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            await interaction.channel.send(options.getString('mensagem'));
            await interaction.reply({ content: '✅ Enviado!', flags: [MessageFlags.Ephemeral] });
        }

        if (commandName === 'limpar') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const qtd = options.getInteger('quantidade');
            await interaction.channel.bulkDelete(qtd, true);
            await interaction.reply({ content: `🧹 Limpei ${qtd} mensagens!`, flags: [MessageFlags.Ephemeral] });
        }

        if (commandName === 'enquete') {
            const p = options.getString('pergunta');
            const embed = new EmbedBuilder().setTitle('📊 Votação').setDescription(`**${p}**`).setColor('#f1c40f').setFooter({ text: `Por: ${interaction.user.username}` });
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('👍'); await msg.react('👎');
        }

        if (commandName === 'banir') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const user = options.getUser('usuario');
            const motivo = options.getString('motivo') || "Não informado";
            const member = interaction.guild.members.cache.get(user.id);
            if (!member?.bannable) return interaction.reply({ content: '❌ Não posso banir este usuário.', flags: [MessageFlags.Ephemeral] });
            await member.ban({ reason: motivo });
            await interaction.reply({ content: `🔨 **${user.tag}** banido por: ${motivo}` });
        }
    }

    // --- BOTÕES ---
    if (interaction.isButton()) {
        const { customId, guild, user, member, channel } = interaction;

        if (customId === 'btn_verificar') {
            const role = guild.roles.cache.get(process.env.ROLE_ID);
            if (!role) return interaction.reply({ content: '❌ Variável ROLE_ID não configurada na Koyeb.', flags: [MessageFlags.Ephemeral] });
            await member.roles.add(role).catch(() => {});
            await interaction.reply({ content: '✅ Verificado!', flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'abrir_ticket') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: process.env.CATEGORY_ID || null,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                    ]
                });
                const btnPainel = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger)
                );
                await ticketChannel.send({ content: `Olá ${user}!`, components: [btnPainel] });
                await interaction.editReply({ content: `Ticket aberto: ${ticketChannel}` });
            } catch (e) { await interaction.editReply({ content: '❌ Erro ao abrir ticket.' }); }
        }

        if (customId === 'assumir_ticket') {
            await interaction.reply({ content: `👤 **${user.username}** assumiu o ticket!` });
        }

        if (customId === 'fechar_ticket') {
            await interaction.reply({ content: '🔒 Fechando e gerando log...' });
            try {
                const attachment = await discordTranscripts.createTranscript(channel, { limit: -1, filename: `log-${channel.name}.html`, saveImages: true, poweredBy: false });
                const logChan = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
                if (logChan) await logChan.send({ content: `📝 Log: **${channel.name}**`, files: [attachment] });
            } catch (e) { console.log(e); }
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(process.env.TOKEN);