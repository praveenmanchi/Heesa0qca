const { Octokit } = require("@octokit/rest");

async function testBlob() {
  const octokit = new Octokit(); 
  try {
    const config = { owner: "praveenmanchi", repo: "jsonn", branch: "update-figma-vars", path: "variables.json" };
    // Try primary content API first
    const { data: fileData } = await octokit.rest.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        ref: config.branch,
        path: config.path,
    });
    console.log("fileData type:", fileData.type);
  } catch (err) {
    if (err.status === 403 || err.status === 422 || (err.message && err.message.includes('too large'))) {
        console.log("Encountered Large File limit. Attempting trees fallback.");
        try {
            // Get branch head commit
            const { data: branchData } = await octokit.rest.repos.getBranch({
                owner: config.owner,
                repo: config.repo,
                branch: config.branch,
            });
            console.log("Branch head SHA:", branchData.commit.sha);
            
            // Get tree recursively
            const { data: treeData } = await octokit.rest.git.getTree({
                owner: config.owner,
                repo: config.repo,
                tree_sha: branchData.commit.sha,
                recursive: 'true',
            });
            
            // Find file
            const fileNode = treeData.tree.find(t => t.path === config.path);
            if (fileNode) {
                console.log("Found file node in tree:", fileNode.path, fileNode.sha);
                let data = { type: 'file', sha: fileNode.sha };
                console.log("Continuing to parse with Git Blob fallback.");
            } else {
                console.log("File not found in tree. Path searched for:", config.path);
            }
            
        } catch (e) {
            console.log("Inner trees API fallback failed:", e.message);
        }
    } else {
        console.log("Unexpected primary API error:", err.status, err.message);
    }
  }
}
testBlob();
