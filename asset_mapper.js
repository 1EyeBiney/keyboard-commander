const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const baseAudioFolder = path.join(__dirname, 'audio');
const dataFilePath = path.join(__dirname, 'kc_data.js'); 

function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList); 
        } else {
            // THE LASER FILTER: Only grab files that begin exactly with "8bit_"
            if (file.startsWith('8bit_')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

function generateNewAudioBankEntries() {
    if (!fs.existsSync(baseAudioFolder) || !fs.existsSync(dataFilePath)) {
        console.error("Error: Could not find the audio folder or kc_data.js file.");
        return;
    }

    // Read the current state of your code
    const existingData = fs.readFileSync(dataFilePath, 'utf8');
    const allAudioFiles = walkDir(baseAudioFolder);
    
    let outputString = "/* NEW '8BIT' ASSETS ONLY - PASTE INTO kc_data.js */\n\n";
    let newAssetCount = 0;

    allAudioFiles.forEach(filePath => {
        // Get the key (filename without extension)
        const key = path.parse(filePath).name;
        
        // Only process this file if the key does NOT already exist in kc_data.js
        if (!existingData.includes(`"${key}"`)) {
            const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
            outputString += `    "${key}": "${relativePath}",\n`;
            newAssetCount++;
        }
    });

    const outputFile = path.join(__dirname, 'audio_bank_update.txt');
    fs.writeFileSync(outputFile, outputString);
    
    console.log(`Success! Found ${newAssetCount} new 8BIT assets. Saved to: ${outputFile}`);
}

generateNewAudioBankEntries();