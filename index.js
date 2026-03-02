const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, MessageFlags, UserSelectMenuBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const http = require('http');

// --- MANTER KOYEB ONLINE ---
const PORT = process.env.PORT || 8000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Suporte Premium Rodando!');
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

// --- ANTI-CRASH (IMPEDE O BOT DE DESLIGAR EM ERROS) ---
process.on('unhandledRejection', (reason) => { console.error('Erro Rejeição:', reason); });
process.on('uncaughtException', (err) => { console.error('Erro Exceção:', err); });

client.once('clientReady', (c) => {
    console.log(`🚀 SUCESSO! Logado como ${c.user.tag}`);
    const commands = [
        { name: 'setup', description: 'Envia a mensagem de tickets' },
        { name: 'verificacao', description: 'Cria o botão de verificação' },
        { name: 'say', description: 'Fale pelo bot', options: [{ name: 'mensagem', type: 3, description: 'O que dizer', required: true }] },
        { name: 'limpar', description: 'Apaga mensagens do chat', options: [{ name: 'quantidade', type: 4, description: 'Qtd (1-100)', required: true }] },
        { name: 'enquete', description: 'Cria uma enquete', options: [{ name: 'pergunta', type: 3, description: 'A pergunta', required: true }] },
        { name: 'banir', description: 'Bane um membro', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: false }] }
    ];
    client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    
    // --- COMANDOS DE BARRA ---
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, channel, member } = interaction;

        if (commandName === 'setup') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const embed = new EmbedBuilder().setTitle('🎫 Central de Suporte').setDescription('Clique abaixo para abrir um ticket de atendimento.').setColor('#5865F2');
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩'));
            await interaction.reply({ embeds: [embed], components: [btn] });
        }

        if (commandName === 'verificacao') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const embed = new EmbedBuilder().setTitle('🛡️ Verificação').setDescription('Clique para verificar sua identidade.').setColor('#2ecc71');
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_verificar').setLabel('Verificar').setStyle(ButtonStyle.Success));
            await interaction.reply({ embeds: [embed], components: [btn] });
        }

        if (commandName === 'say') {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            await channel.send(options.getString('mensagem'));
            await interaction.reply({ content: '✅ Enviado!', flags: [MessageFlags.Ephemeral] });
        }

        if (commandName === 'limpar') {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            await channel.bulkDelete(options.getInteger('quantidade'), true);
            await interaction.reply({ content: '🧹 Chat limpo!', flags: [MessageFlags.Ephemeral] });
        }

        if (commandName === 'enquete') {
            const p = options.getString('pergunta');
            const embed = new EmbedBuilder().setTitle('📊 Votação').setDescription(p).setColor('#f1c40f').setTimestamp();
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('👍'); await msg.react('👎');
        }

        if (commandName === 'banir') {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const user = options.getUser('usuario');
            const target = guild.members.cache.get(user.id);
            if (!target?.bannable) return interaction.reply({ content: '❌ Não posso banir este membro.', flags: [MessageFlags.Ephemeral] });
            await target.ban({ reason: options.getString('motivo') || 'Sem motivo' });
            await interaction.reply({ content: `🔨 **${user.tag}** foi banido.` });
        }
    }

    // --- INTERAÇÕES DE BOTÕES ---
    if (interaction.isButton()) {
        const { customId, guild, user, member, channel } = interaction;

        // Botões liberados para qualquer um
        if (customId === 'btn_verificar') {
            const role = guild.roles.cache.get(process.env.ROLE_ID);
            if (!role) return interaction.reply({ content: '❌ ROLE_ID não configurada na Koyeb.', flags: [MessageFlags.Ephemeral] });
            await member.roles.add(role).catch(() => {});
            return interaction.reply({ content: '✅ Verificado!', flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'abrir_ticket') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: process.env.CATEGORY_ID || null,
                    topic: `Dono: ${user.id}`, // Guardamos o ID do dono no tópico do canal
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                    ]
                });

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('arquivar_ticket').setLabel('Arquivar').setStyle(ButtonStyle.Secondary).setEmoji('📁'),
                    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Excluir').setStyle(ButtonStyle.Danger)
                );
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('add_membro').setLabel('Add').setStyle(ButtonStyle.Primary).setEmoji('➕'),
                    new ButtonBuilder().setCustomId('rem_membro').setLabel('Rem').setStyle(ButtonStyle.Primary).setEmoji('➖')
                );

                await ticketChannel.send({ 
                    content: `Olá ${user}! Painel de controle do ticket:`, 
                    embeds: [new EmbedBuilder().setDescription("Utilize os botões abaixo para gerenciar o atendimento.").setColor("#2f3136")], 
                    components: [row1, row2] 
                });
                return interaction.editReply({ content: `✅ Ticket aberto em ${ticketChannel}` });
            } catch (e) { return interaction.editReply({ content: '❌ Erro ao criar canal.' }); }
        }

        // --- TRAVA DE SEGURANÇA (SÓ STAFF PODE CLICAR A PARTIR DAQUI) ---
        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ Apenas a **Equipe de Suporte** pode usar estes botões!', flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'assumir_ticket') {
            return interaction.reply(`👤 **${user.username}** (Staff) assumiu este ticket.`);
        }

        if (customId === 'add_membro') {
            const menu = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('select_add').setPlaceholder('Selecione quem adicionar'));
            return interaction.reply({ content: 'Escolha o membro:', components: [menu], flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'rem_membro') {
            const menu = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Selecione quem remover'));
            return interaction.reply({ content: 'Escolha o membro:', components: [menu], flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'arquivar_ticket') {
            await interaction.reply('📁 Arquivando ticket...');
            const ownerId = channel.topic?.split('Dono: ')[1];
            if (ownerId) await channel.permissionOverwrites.delete(ownerId).catch(() => {});
            
            await channel.setName(`📁-arquivado-${channel.name.replace('ticket-', '')}`);
            
            const btnDesarquivar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('desarquivar_ticket').setLabel('Desarquivar').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Excluir Definitivo').setStyle(ButtonStyle.Danger)
            );
            return channel.send({ content: '📦 **Ticket Arquivado.** O usuário perdeu o acesso.', components: [btnDesarquivar] });
        }

        if (customId === 'desarquivar_ticket') {
            const ownerId = channel.topic?.split('Dono: ')[1];
            if (!ownerId) return interaction.reply({ content: '❌ Não achei o dono no tópico!', flags: [MessageFlags.Ephemeral] });
            
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            await channel.setName(`ticket-reaberto`);
            return interaction.reply('🔓 **Ticket Desarquivado!** O dono recuperou o acesso.');
        }

        if (customId === 'fechar_ticket') {
            await interaction.reply('🔒 Gerando logs e deletando...');
            try {
                const attachment = await discordTranscripts.createTranscript(channel, { limit: -1, filename: `log-${channel.name}.html`, saveImages: true, poweredBy: false });
                const logChan = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
                if (logChan) await logChan.send({ content: `📝 Log final do ticket: **${channel.name}**`, files: [attachment] });
            } catch (e) { console.log(e); }
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // --- SELEÇÃO DE USUÁRIOS (MENUS) ---
    if (interaction.isUserSelectMenu()) {
        const targetId = interaction.values[0];
        if (interaction.customId === 'select_add') {
            await interaction.channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            return interaction.reply(`✅ <@${targetId}> foi adicionado.`);
        }
        if (interaction.customId === 'select_rem') {
            await interaction.channel.permissionOverwrites.delete(targetId);
            return interaction.reply(`❌ <@${targetId}> foi removido.`);
        }
    }
});

client.login(process.env.TOKEN);