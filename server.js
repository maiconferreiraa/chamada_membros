const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicialização do Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- FUNÇÃO DE IMPORTAÇÃO AUTOMÁTICA ---
async function importarMembrosAutomatico() {
    console.log("Iniciando sincronização automática de membros...");
    try {
        const filePath = path.join(__dirname, 'membros.txt');
        if (!fs.existsSync(filePath)) {
            console.log("Aviso: membros.txt não encontrado. Pulando importação.");
            return;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        const linhas = data.split('\n').filter(l => l.trim() !== "");
        const batch = db.batch();
        let total = 0;

        linhas.forEach(linha => {
            const partes = linha.split(' - ');
            if (partes.length >= 3) {
                const nome = partes[0].trim().toUpperCase();
                const grupo = partes[1].trim();
                const categoria = partes[2].trim();

                const ref = db.collection('membros').doc(nome);
                // O merge: true é vital para não apagar as funções que tu já add manualmente
                batch.set(ref, { 
                    nome, 
                    grupo, 
                    categoria 
                }, { merge: true });
                total++;
            }
        });

        await batch.commit();
        console.log(`Sucesso: ${total} membros sincronizados automaticamente.`);
    } catch (err) {
        console.error("Erro na importação automática:", err);
    }
}

// Executa a importação assim que o app inicia
importarMembrosAutomatico();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));