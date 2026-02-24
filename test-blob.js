const { Octokit } = require("@octokit/rest");

async function testBlob() {
  const octokit = new Octokit(); 
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: "octocat",
      repo: "Hello-World",
      path: "README", 
    });
    
    if (data.sha) {
       const { data: blob } = await octokit.rest.git.getBlob({
         owner: "octocat",
         repo: "Hello-World",
         file_sha: data.sha,
       });
       console.log("Blob encoding:", blob.encoding);
       console.log("Blob content length:", blob.content?.length);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}
testBlob();
