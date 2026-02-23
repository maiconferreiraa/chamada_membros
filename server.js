const express = require('express');
const admin = require('firebase-admin');
const pdf = require('pdf-parse');
const multer = require('multer');
const cors = require('cors');

const app = express();
const upload = multer();

// Mantendo o suporte para os arquivos estáticos da pasta public
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicialização do Firebase Admin via Variável de Ambiente do Render
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Rota para processar o PDF sem alterar os dados que já existem
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const data = await pdf(req.file.buffer);
        const texto = data.text;
        
        // Limpeza básica das linhas do PDF da Maranata
        const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        
        const batch = db.batch();
        linhas.forEach(nome => {
            // Filtro para ignorar cabeçalhos do SGI e focar nos membros
            if(!nome.includes("SGI") && !nome.includes("PAGE") && !nome.includes("IGREJA")) {
                const ref = db.collection('membros').doc(nome);
                batch.set(ref, { 
                    nome: nome, 
                    ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp() 
                }, { merge: true });
            }
        });
        
        await batch.commit();
        res.send({ message: "Membros sincronizados com sucesso!" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Porta dinâmica para o Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em modo Dark na porta ${PORT}`);
});