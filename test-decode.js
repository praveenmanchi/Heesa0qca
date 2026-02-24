const fs = require('fs');

async function run() {
  const content = fs.readFileSync('/Users/praveenmanchi/Downloads/variables.json', 'utf8');
  // Mock what github gives us
  const base64Content = Buffer.from(content).toString('base64');
  
  try {
    const base64 = base64Content.replace(/\n/g, '');
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i += 1) {
      bytes[i] = binString.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    console.log("Decoded size:", decoded.length, "Original size:", content.length);
    if(decoded === content) {
      console.log("Success!");
    } else {
      console.log("Mismatch!");
    }
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
run();
