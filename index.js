const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, MessageFlags, UserSelectMenuBuilder, StringSelectMenuBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const http = require('http');

// --- MANTER KOYEB ONLINE ---
const PORT = process.env.PORT || 8000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Suporte Premium + Categorias Online!');
}).listen(PORT, '0.0.0.0');

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

// --- ANTI-CRASH ---
process.on('unhandledRejection', (reason) => { console.error('Erro Rejeição:', reason); });
process.on('uncaughtException', (err) => { console.error('Erro Exceção:', err); });

client.once('ready', (c) => {
    console.log(`🚀 SUCESSO! Logado como ${c.user.tag}`);
    const commands = [
        { name: 'setup', description: 'Envia o painel de tickets com categorias' },
        { name: 'verificacao', description: 'Cria o botão de verificação' },
        { name: 'say', description: 'Fale pelo bot', options: [{ name: 'mensagem', type: 3, description: 'O que dizer', required: true }] },
        { name: 'limpar', description: 'Apaga mensagens do chat', options: [{ name: 'quantidade', type: 4, description: 'Qtd (1-100)', required: true }] },
        { name: 'enquete', description: 'Cria uma enquete', options: [{ name: 'pergunta', type: 3, description: 'A pergunta', required: true }] },
        { name: 'banir', description: 'Bane um membro', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: false }] }
    ];
    client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    
    // ==========================================
    // 1. COMANDOS DE BARRA
    // ==========================================
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, channel, member } = interaction;

        if (commandName === 'setup') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Apenas ADMs.', flags: [MessageFlags.Ephemeral] });
            
            const embed = new EmbedBuilder()
                .setTitle('🎫 Central de Atendimento')
                .setDescription('Selecione abaixo a categoria que melhor descreve o seu problema ou solicitação para abrir um ticket.')
                .setColor('#5865F2');
            
            // MENU DE SELEÇÃO COM AS CATEGORIAS
            const menuTickets = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_ticket_type')
                    .setPlaceholder('Selecione uma categoria...')
                    .addOptions([
                        { label: 'Suporte', description: 'Precisa de ajuda ou suporte técnico?', value: 'suporte', emoji: '🛠️' },
                        { label: 'Avaliação', description: 'Deixe seu feedback ou avaliação.', value: 'avaliacao', emoji: '⭐' },
                        { label: 'Contratar', description: 'Deseja adquirir nossos serviços?', value: 'contratar', emoji: '🛒' },
                        { label: 'Dúvidas', description: 'Tem alguma pergunta geral?', value: 'duvidas', emoji: '❓' }
                    ])
            );
            await interaction.reply({ embeds: [embed], components: [menuTickets] });
        }

        if (commandName === 'verificacao') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Apenas ADMs.', flags: [MessageFlags.Ephemeral] });
            const embed = new EmbedBuilder().setTitle('🛡️ Verificação').setDescription('Clique para verificar sua identidade e ganhar acesso.').setColor('#2ecc71');
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
            await interaction.reply({ content: '🧹 Limpo!', flags: [MessageFlags.Ephemeral] });
        }

        if (commandName === 'enquete') {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const embed = new EmbedBuilder().setTitle('📊 Votação').setDescription(options.getString('pergunta')).setColor('#f1c40f');
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('👍'); await msg.react('👎');
        }

        if (commandName === 'banir') {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Sem permissão.', flags: [MessageFlags.Ephemeral] });
            const user = options.getUser('usuario');
            const target = guild.members.cache.get(user.id);
            if (!target?.bannable) return interaction.reply({ content: '❌ Não posso banir este membro.', flags: [MessageFlags.Ephemeral] });
            await target.ban({ reason: options.getString('motivo') || 'Sem motivo' });
            await interaction.reply({ content: `🔨 **${user.tag}** banido.` });
        }
    }

    // ==========================================
    // 2. CRIAÇÃO DE TICKET (MENU DE SELEÇÃO DE TEXTO)
    // ==========================================
    if (interaction.isStringSelectMenu()) {
        const { customId, guild, user, values } = interaction;

        if (customId === 'select_ticket_type') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const categoria = values[0]; // 'suporte', 'avaliacao', etc.
            
            try {
                const ticketChannel = await guild.channels.create({
                    name: `${categoria}-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: process.env.CATEGORY_ID || null,
                    topic: `Dono: ${user.id} | Categoria: ${categoria}`,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                    ]
                });

                // PAINEL DE CONTROLE DA STAFF DENTRO DO TICKET
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir').setStyle(ButtonStyle.Success).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('arquivar_ticket').setLabel('Arquivar').setStyle(ButtonStyle.Secondary).setEmoji('📁'),
                    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Excluir').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('add_membro').setLabel('Add Membro').setStyle(ButtonStyle.Primary).setEmoji('➕'),
                    new ButtonBuilder().setCustomId('rem_membro').setLabel('Rem Membro').setStyle(ButtonStyle.Primary).setEmoji('➖')
                );

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`Ticket de ${categoria.toUpperCase()}`)
                    .setDescription(`Olá ${user}, nossa equipe foi notificada.\nDescreva seu assunto abaixo para agilizar o atendimento.`)
                    .setColor('#2ecc71');

                await ticketChannel.send({ content: `${user}`, embeds: [welcomeEmbed], components: [row1, row2] });
                return interaction.editReply({ content: `✅ Seu ticket foi aberto com sucesso em: ${ticketChannel}` });
            } catch (e) {
                console.error(e);
                return interaction.editReply({ content: '❌ Ocorreu um erro ao criar o canal. Verifique as permissões.' });
            }
        }
    }

    // ==========================================
    // 3. INTERAÇÕES DE BOTÕES (CONTROLE E STAFF)
    // ==========================================
    if (interaction.isButton()) {
        const { customId, guild, user, member, channel } = interaction;

        // VERIFICAÇÃO PÚBLICA
        if (customId === 'btn_verificar') {
            const role = guild.roles.cache.get(process.env.ROLE_ID);
            if (role) await member.roles.add(role).catch(() => {});
            return interaction.reply({ content: '✅ Identidade verificada com sucesso!', flags: [MessageFlags.Ephemeral] });
        }

        // --- TRAVA DE SEGURANÇA PARA ADMS NO TICKET ---
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Apenas **Administradores** podem gerenciar os tickets!', flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'assumir_ticket') return interaction.reply(`🤠 **${user.username}** (Staff) assumiu a responsabilidade deste ticket.`);

        if (customId === 'add_membro') {
            const menu = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('select_add').setPlaceholder('Selecione quem você deseja ADICIONAR'));
            return interaction.reply({ content: 'Selecione o membro:', components: [menu], flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'rem_membro') {
            const menu = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Selecione quem você deseja REMOVER'));
            return interaction.reply({ content: 'Selecione o membro:', components: [menu], flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'arquivar_ticket') {
            await interaction.reply('📁 Arquivando ticket...');
            const ownerId = channel.topic?.split('Dono: ')[1]?.split(' |')[0]; // Extrai o ID isolado
            if (ownerId) await channel.permissionOverwrites.delete(ownerId).catch(() => {});
            
            await channel.setName(`📁-arquivado-${channel.name.split('-')[1] || 'ticket'}`);
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('desarquivar_ticket').setLabel('Desarquivar').setStyle(ButtonStyle.Success).setEmoji('🔓')
            );
            return channel.send({ content: '📦 **Ticket Arquivado.** O usuário perdeu o acesso à leitura.', components: [row] });
        }

        if (customId === 'desarquivar_ticket') {
            const ownerId = channel.topic?.split('Dono: ')[1]?.split(' |')[0];
            if (ownerId) await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            await channel.setName(`ticket-reaberto`);
            return interaction.reply('🔓 **Ticket Desarquivado!** O usuário recuperou o acesso.');
        }

        if (customId === 'fechar_ticket') {
            await interaction.reply('🔒 Gerando logs e excluindo o canal...');
            try {
                const attachment = await discordTranscripts.createTranscript(channel, { limit: -1, filename: `log-${channel.name}.html`, saveImages: true, poweredBy: false });
                const logChan = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
                if (logChan) await logChan.send({ content: `📝 Log de atendimento: **${channel.name}**`, files: [attachment] });
            } catch (e) { console.error("Erro ao gerar log:", e); }
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // ==========================================
    // 4. MENUS DE SELEÇÃO DE USUÁRIOS (ADD/REM MEMBROS)
    // ==========================================
    if (interaction.isUserSelectMenu()) {
        const targetId = interaction.values[0];
        
        if (interaction.customId === 'select_add') {
            await interaction.channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            return interaction.reply(`✅ Membro <@${targetId}> foi **adicionado** a este ticket.`);
        }
        
        if (interaction.customId === 'select_rem') {
            await interaction.channel.permissionOverwrites.delete(targetId);
            return interaction.reply(`❌ Membro <@${targetId}> foi **removido** deste ticket.`);
        }
    }
});

client.login(process.env.TOKEN);