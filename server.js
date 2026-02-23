const express = require('express');
const admin = require('firebase-admin');
const pdf = require('pdf-parse');
const multer = require('multer');
const cors = require('cors');

const app = express(); // <--- O erro acontecia porque essa linha faltava!
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicialização segura do Firebase Admin via Environment Variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Rota para processar o PDF (Maicon Sena, Davidson, etc.)
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const data = await pdf(req.file.buffer);
        const texto = data.text;
        const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        
        const batch = db.batch();
        linhas.forEach(nome => {
            if(!nome.includes("SGI") && !nome.includes("PAGE")) {
                const ref = db.collection('membros').doc(nome);
                batch.set(ref, { 
                    nome: nome, 
                    ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp() 
                }, { merge: true });
            }
        });
        await batch.commit();
        res.send({ message: "Membros importados com sucesso!" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Porta padrão para o Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));