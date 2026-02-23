const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração via Variável de Ambiente no Render
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Rota para importar a lista TXT inicial
app.get('/importar-txt', async (req, res) => {
    try {
        const data = fs.readFileSync('membros.txt', 'utf8');
        const linhas = data.split('\n');
        const batch = db.batch();

        linhas.forEach(linha => {
            if (linha.trim()) {
                const [nome, grupo, categoria] = linha.split(' - ').map(s => s.trim());
                const ref = db.collection('membros').doc(nome);
                batch.set(ref, { 
                    nome, 
                    grupo, 
                    categoria, 
                    funcoes: [] // Começa vazio para você editar no app
                }, { merge: true });
            }
        });
        await batch.commit();
        res.send("Lista importada com sucesso!");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));