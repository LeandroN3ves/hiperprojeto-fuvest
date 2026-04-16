const fs = require('fs');
const pdf = require('pdf-parse');

async function testExtract() {
    // 1st Phase
    const file1 = 'c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/ProvasFuvest/fuv2018_1fase_prova_V.pdf';
    // 2nd Phase
    const file2 = 'c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/ProvasFuvest/fuv2018_2fase_dia1.pdf';
    
    try {
        console.log('--- EXTRACTING 1ST PHASE ---');
        const buffer1 = fs.readFileSync(file1);
        const data1 = await pdf(buffer1);
        console.log(data1.text.substring(0, 2000));
        
        console.log('\n--- EXTRACTING 2ND PHASE ---');
        const buffer2 = fs.readFileSync(file2);
        const data2 = await pdf(buffer2);
        console.log(data2.text.substring(0, 2000));
        
    } catch (err) {
        console.error('Error during extraction:', err);
    }
}

testExtract();
