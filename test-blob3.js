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
       console.log("Found file SHA:", fileNode.sha);
       const { data: blob } = await octokit.rest.git.getBlob({
           owner: "praveenmanchi",
           repo: "jsonn",
           file_sha: fileNode.sha,
       });

       console.log("Blob encoding:", blob.encoding);
       
       if (blob.encoding === 'base64') {
           const base64 = blob.content.replace(/\n/g, '');
           console.log("Base64 string parsed length:", base64.length);
           try {
             const binString = atob(base64);
             console.log("binString length:", binString.length);
           } catch(e) {
             console.error("atob error:", e.message);
           }
       }
    } else {
       console.log("File not found in tree");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}
testBlob();
