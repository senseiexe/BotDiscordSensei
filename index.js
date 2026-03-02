// ... (mantenha o início do código igual)

client.on('interactionCreate', async interaction => {
    
    // --- COMANDOS DE BARRA ---
    if (interaction.isChatInputCommand()) {
        // (Mantenha os comandos de barra como estão, eles já têm travas de Admin/ManageMessages)
        // ... 
    }

    // --- INTERAÇÕES DE BOTÕES COM TRAVA DE STAFF ---
    if (interaction.isButton()) {
        const { customId, guild, user, member, channel } = interaction;

        // Botões que QUALQUER UM pode clicar
        if (customId === 'btn_verificar') {
            const role = guild.roles.cache.get(process.env.ROLE_ID);
            if (role) await member.roles.add(role).catch(() => {});
            return interaction.reply({ content: '✅ Verificado!', flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'abrir_ticket') {
            // Lógica de abrir ticket (Qualquer um pode abrir)
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: process.env.CATEGORY_ID || null,
                    topic: `Dono: ${user.id}`,
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

                await ticketChannel.send({ content: `Olá ${user}! Painel Staff:`, components: [row1, row2] });
                return interaction.editReply({ content: `✅ Ticket aberto em ${ticketChannel}` });
            } catch (e) { return interaction.editReply({ content: '❌ Erro ao criar canal.' }); }
        }

        // --- TRAVA DE SEGURANÇA PARA STAFF ---
        // Se o botão não for de verificação ou abrir, checamos se é Staff
        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ Apenas a **Equipe de Suporte** pode usar estes botões!', flags: [MessageFlags.Ephemeral] });
        }

        // A partir daqui, SÓ A STAFF PASSA
        if (customId === 'assumir_ticket') {
            return interaction.reply(`👤 **${user.username}** (Staff) assumiu o atendimento.`);
        }

        if (customId === 'add_membro') {
            const menu = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('select_add').setPlaceholder('Selecionar membro'));
            return interaction.reply({ content: 'Escolha quem adicionar:', components: [menu], flags: [MessageFlags.Ephemeral] });
        }

        if (customId === 'rem_membro') {
            const menu = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Selecionar membro'));
            return interaction.reply({ content: 'Escolha quem remover:', components: [menu], flags: [MessageFlags.Ephemeral] });
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
            return channel.send({ content: '📦 **Ticket Arquivado.** Usuário perdeu o acesso.', components: [btnDesarquivar] });
        }

        if (customId === 'desarquivar_ticket') {
            const ownerId = channel.topic?.split('Dono: ')[1];
            if (!ownerId) return interaction.reply({ content: '❌ Dono não encontrado.', flags: [MessageFlags.Ephemeral] });
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            await channel.setName(`ticket-reaberto`);
            return interaction.reply('🔓 **Ticket Desarquivado!** O dono recuperou o acesso.');
        }

        if (customId === 'fechar_ticket') {
            await interaction.reply('🔒 Gerando logs e deletando...');
            try {
                const attachment = await discordTranscripts.createTranscript(channel, { limit: -1, filename: `log-${channel.name}.html`, saveImages: true, poweredBy: false });
                const logChan = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
                if (logChan) await logChan.send({ content: `📝 Log final: **${channel.name}**`, files: [attachment] });
            } catch (e) { console.log(e); }
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // ... (mantenha os menus de seleção iguais)
});

client.login(process.env.TOKEN);