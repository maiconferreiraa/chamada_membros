// No seu server.js, altere a rota de upload para capturar múltiplas funções
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
    const data = await pdf(req.file.buffer);
    const linhas = data.text.split('\n');
    
    // Objeto para agrupar funções por membro
    let membrosMap = {}; 

    // Exemplo de lógica para o seu PDF da Maranata
    // Mapeia o membro e adiciona as funções num array
    linhas.forEach(linha => {
        // Lógica para detectar Nome e Função (ex: "MAICON SENA - Instrumentista")
        if(linha.includes('-')) {
            const [nome, funcao] = linha.split('-').map(s => s.trim());
            if(!membrosMap[nome]) membrosMap[nome] = { nome, funcoes: [] };
            if(!membrosMap[nome].funcoes.includes(funcao)) {
                membrosMap[nome].funcoes.push(funcao);
            }
        }
    });

    const batch = db.batch();
    Object.values(membrosMap).forEach(membro => {
        const ref = db.collection('membros').doc(membro.nome);
        batch.set(ref, membro, { merge: true });
    });
    await batch.commit();
    res.send("Membros e Funções atualizados!");
});