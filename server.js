const express = require('express');
const admin = require('firebase-admin');
const pdf = require('pdf-parse');
const multer = require('multer');
const cors = require('cors');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// CONFIGURAÇÃO DO SDK ADMIN
// Em produção (Render), usaremos variáveis de ambiente para segurança
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Rota para processar o PDF dos membros da Igreja Maranata
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const data = await pdf(req.file.buffer);
        const texto = data.text;
        
        // Lógica de extração baseada na estrutura do seu PDF [cite: 3, 12, 20]
        const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        
        for (let nome of linhas) {
            // Filtro simples para ignorar cabeçalhos e focar em nomes/funções
            if (!nome.includes("SGI") && !nome.includes("IGREJA")) {
                await db.collection('membros').doc(nome).set({
                    nome: nome,
                    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
        res.status(200).send({ message: "Membros sincronizados com sucesso!" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Rota para salvar chamada (Bloqueia Sexta-feira)
app.post('/salvar-chamada', async (req, res) => {
    const { presencas } = req.body; // Array de objetos {nome, status}
    const hoje = new Date();
    
    if (hoje.getDay() === 5) { // Regra: Sexta-feira = Culto no Lar
        return res.status(403).send({ error: "Chamada bloqueada na sexta-feira." });
    }

    const batch = db.batch();
    const dataString = hoje.toISOString().split('T')[0];

    presencas.forEach(p => {
        const ref = db.collection('historico').doc(`${p.nome}_${dataString}`);
        batch.set(ref, {
            nome: p.nome,
            status: p.status, // "Presente" ou "Ausente"
            data: dataString,
            diaSemana: hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
        });
    });

    await batch.commit();
    res.send({ message: "Chamada salva!" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));