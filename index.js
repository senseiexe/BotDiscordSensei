const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const http = require('http');

// --- MANTER KOYEB ONLINE ---
const PORT = process.env.PORT || 8000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Gerente Online!');
}).listen(PORT, '0.0.0.0');

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

let ticketCount = 1;

client.once('ready', () => {
    console.log(`🚀 SUCESSO! Logado como ${client.user.tag}`);
    
    // Lista de todos os Comandos
    const commands = [
        { name: 'setup', description: 'Envia a mensagem de tickets' },
        { 
            name: 'say', 
            description: 'Fale se passando pelo bot',
            options: [{ name: 'mensagem', type: 3, description: 'O que o bot deve dizer', required: true }]
        },
        { 
            name: 'enquete', 
            description: 'Cria uma enquete com reações',
            options: [{ name: 'pergunta', type: 3, description: 'A pergunta da enquete', required: true }]
        },
        { 
            name: 'limpar', 
            description: 'Apaga várias mensagens do chat de uma vez',
            options: [{ name: 'quantidade', type: 4, description: 'Quantas mensagens (1 a 100)', required: true }]
        },
        { 
            name: 'banir', 
            description: 'Bane um usuário do servidor',
            options: [{ name: 'usuario', type: 6, description: 'Usuário a ser banido', required: true }, { name: 'motivo', type: 3, description: 'Motivo do banimento', required: false }]
        },
        { name: 'verificacao', description: 'Cria o botão de verificação de membros' }
    ];
    
    client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    // ==========================================
    // COMANDOS DE BARRA (CHAT INPUT)
    // ==========================================
    if (interaction.isChatInputCommand()) {

        // --- SETUP DE TICKETS ---
        if (interaction.commandName === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            
            const embed = new EmbedBuilder()
                .setTitle('🎫 Central de Atendimento')
                .setDescription('Clique abaixo para abrir um ticket privado com a nossa equipe.')
                .setColor('#5865F2');
            const button = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setEmoji('📩').setStyle(ButtonStyle.Primary));
            await interaction.reply({ embeds: [embed], components: [button] });
        }

        // --- SISTEMA DE VERIFICAÇÃO ---
        if (interaction.commandName === 'verificacao') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Verificação de Segurança')
                .setDescription('Para ter acesso aos canais do servidor, clique no botão abaixo para provar que você é humano.')
                .setColor('#2ecc71');
            const button = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_verificar').setLabel('Me Verificar').setEmoji('✅').setStyle(ButtonStyle.Success));
            await interaction.reply({ embeds: [embed], components: [button] });
        }

        // --- COMANDO SAY ---
        if (interaction.commandName === 'say') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const mensagem = interaction.options.getString('mensagem');
            await interaction.channel.send(mensagem);
            await interaction.reply({ content: '✅ Mensagem enviada!', ephemeral: true });
        }

        // --- CRIAR ENQUETE ---
        if (interaction.commandName === 'enquete') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const pergunta = interaction.options.getString('pergunta');
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Nova Enquete!')
                .setDescription(`**${pergunta}**`)
                .setColor('#f1c40f')
                .setFooter({ text: `Enquete criada por ${interaction.user.username}` });

            const message = await interaction.reply({ embeds: [embed], fetchReply: true });
            await message.react('👍');
            await message.react('👎');
        }

        // --- LIMPAR CHAT ---
        if (interaction.commandName === 'limpar') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            
            const quantidade = interaction.options.getInteger('quantidade');
            if (quantidade < 1 || quantidade > 100) return interaction.reply({ content: '⚠️ Escolha um número entre 1 e 100.', ephemeral: true });

            await interaction.channel.bulkDelete(quantidade, true).catch(err => {
                return interaction.reply({ content: '❌ Erro: Não posso apagar mensagens com mais de 14 dias.', ephemeral: true });
            });
            await interaction.reply({ content: `🧹 \`${quantidade}\` mensagens foram apagadas por ${interaction.user}!`, ephemeral: true }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 4000);
            });
        }

        // --- BANIR USUÁRIO ---
        if (interaction.commandName === 'banir') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            
            const alvo = interaction.options.getUser('usuario');
            const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
            const membro = interaction.guild.members.cache.get(alvo.id);

            if (!membro) return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
            if (!membro.bannable) return interaction.reply({ content: '❌ Não tenho permissão para banir essa pessoa (cargo dela é maior que o meu).', ephemeral: true });

            await membro.ban({ reason: motivo });
            await interaction.reply({ content: `🔨 **${alvo.tag}** foi banido com sucesso!\n**Motivo:** ${motivo}` });
        }
    }

    // ==========================================
    // INTERAÇÕES DE BOTÕES
    // ==========================================
    if (interaction.isButton()) {
        
        // --- BOTÃO: VERIFICAR MEMBRO ---
        if (interaction.customId === 'btn_verificar') {
            const roleId = process.env.ROLE_ID; // Pegamos o ID do cargo lá da Koyeb
            const role = interaction.guild.roles.cache.get(roleId);
            
            if (!role) return interaction.reply({ content: '❌ O sistema de verificação não está configurado corretamente (Cargo não encontrado).', ephemeral: true });
            
            if (interaction.member.roles.cache.has(roleId)) {
                return interaction.reply({ content: '⚠️ Você já está verificado!', ephemeral: true });
            }

            try {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: '✅ Verificação concluída! Bem-vindo(a) ao servidor.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Erro ao te dar o cargo. Meu cargo de Bot precisa estar ACIMA do cargo de verificado nas configurações do servidor.', ephemeral: true });
            }
        }

        // --- BOTÕES DE TICKET (Inalterados) ---
        if (interaction.customId === 'abrir_ticket') {
            const protocol = ticketCount++;
            try {
                const channel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}-${protocol}`,
                    type: ChannelType.GuildText,
                    parent: process.env.CATEGORY_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    ],
                });
                await interaction.reply({ content: `✅ Ticket criado: ${channel}`, ephemeral: true });
                
                const closeBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
                );
                await channel.send({ content: `Olá ${interaction.user}, como podemos ajudar?`, components: [closeBtn] });
            } catch (e) { console.error(e); }
        }

        if (interaction.customId === 'fechar_ticket') {
            await interaction.reply('🔒 Encerrando em 5 segundos...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(process.env.TOKEN);