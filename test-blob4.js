const { Octokit } = require("@octokit/rest");

async function testBlob() {
  const octokit = new Octokit(); 
  try {
    const { data: branchData } = await octokit.rest.repos.getBranch({
        owner: "praveenmanchi",
        repo: "jsonn",
        branch: "update-figma-vars",
    });
    
    const { data: treeData } = await octokit.rest.git.getTree({
        owner: "praveenmanchi",
        repo: "jsonn",
        tree_sha: branchData.commit.sha,
        recursive: 'true',
    });

    const fileNode = treeData.tree.find(t => t.path === "variables.json");
    if (fileNode) {
       const { data: blob } = await octokit.rest.git.getBlob({
           owner: "praveenmanchi",
           repo: "jsonn",
           file_sha: fileNode.sha,
       });

       if (blob.encoding === 'base64') {
           const base64 = blob.content.replace(/\n/g, '');
           try {
             // In-browser polyfill equivalent
             const buffer = Buffer.from(base64, 'base64');
             const binString = buffer.toString('binary');
             const bytes = new Uint8Array(binString.length);
             for (let i = 0; i < binString.length; i += 1) {
                 bytes[i] = binString.charCodeAt(i);
             }
             const result = new TextDecoder().decode(bytes);
             console.log("Final decoded string length:", result.length);
           } catch(e) {
             console.error("decode error:", e.message);
           }
       }
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}
testBlob();
