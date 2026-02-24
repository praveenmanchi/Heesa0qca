import { Octokit } from '@octokit/rest';

export interface PullRequestConfig {
  pat: string;
  owner: string;
  repo: string;
  baseBranch: string;
  targetBranch: string;
  title: string;
  body: string;
  files: { path: string; content: string }[];
  commitMessage?: string;
  baseUrl?: string;
}

export async function createGitHubPullRequest(config: PullRequestConfig): Promise<string> {
  const octokit = new Octokit({
    auth: config.pat,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  });

  // 1. Get base branch SHA
  let baseSha: string;
  try {
    const { data: baseRef } = await octokit.rest.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.baseBranch}`,
    });
    baseSha = baseRef.object.sha;
  } catch (err: any) {
    if (err.status === 404) {
      throw new Error(`Base branch '${config.baseBranch}' not found, or repository '${config.owner}/${config.repo}' is private/inaccessible. Please check your PAT permissions, owner, repo, and branch names.`);
    }
    throw err;
  }

  // 2. Determine target branch SHA
  let targetSha = baseSha;
  let branchExists = false;

  try {
    const { data: targetRef } = await octokit.rest.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.targetBranch}`,
    });
    targetSha = targetRef.object.sha;
    branchExists = true;
  } catch (err: any) {
    if (err.status !== 404) {
      throw err;
    }
    // Branch does not exist, which is fine. We will create it.
  }

  if (!branchExists) {
    await octokit.rest.git.createRef({
      owner: config.owner,
      repo: config.repo,
      ref: `refs/heads/${config.targetBranch}`,
      sha: baseSha,
    });
  }

  // 3. Create blob for each file and build tree array
  const treeItems = await Promise.all(
    config.files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: config.owner,
        repo: config.repo,
        content: file.content,
        encoding: 'utf-8',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    }),
  );

  // 4. Create new tree based on targetSha so we don't overwrite previous commits on the target branch
  const { data: newTree } = await octokit.rest.git.createTree({
    owner: config.owner,
    repo: config.repo,
    base_tree: targetSha,
    tree: treeItems,
  });

  // 5. Create commit
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner: config.owner,
    repo: config.repo,
    message: config.commitMessage || config.title,
    tree: newTree.sha,
    parents: [targetSha],
  });

  // 6. Update target branch reference
  await octokit.rest.git.updateRef({
    owner: config.owner,
    repo: config.repo,
    ref: `heads/${config.targetBranch}`,
    sha: newCommit.sha,
  });

  // 7. Create Pull Request (or return existing one)
  try {
    const { data: pr } = await octokit.rest.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: config.title,
      body: config.body,
      head: config.targetBranch,
      base: config.baseBranch,
    });
    return pr.html_url;
  } catch (err: any) {
    // Validation Failed (422) usually means the PR already exists for this branch pairing
    if (err.status === 422 && err.message?.includes('A pull request already exists')) {
      // Find the existing PR
      const { data: prs } = await octokit.rest.pulls.list({
        owner: config.owner,
        repo: config.repo,
        head: `${config.owner}:${config.targetBranch}`,
        base: config.baseBranch,
        state: 'open',
      });
      if (prs.length > 0) {
        return prs[0].html_url;
      }
    }
    throw err;
  }
}

export async function getGitHubBranches(config: { pat: string; owner: string; repo: string; baseUrl?: string }): Promise<string[]> {
  const octokit = new Octokit({
    auth: config.pat,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  });

  const { data: branches } = await octokit.rest.repos.listBranches({
    owner: config.owner,
    repo: config.repo,
    per_page: 100,
  });

  return branches.map((branch) => branch.name);
}

export async function getGitHubFileContent(config: { pat: string; owner: string; repo: string; branch: string; path: string; baseUrl?: string }): Promise<string> {
  const octokit = new Octokit({
    auth: config.pat,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  });

  try {
    console.log(`[getGitHub] Fetching from ${config.owner}/${config.repo} branch: ${config.branch} path: ${config.path}`);
    const { data } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: config.path,
      ref: config.branch,
    });
    console.log('[getGitHub] Fast path success! Data type:', typeof data);

    if (Array.isArray(data)) {
      throw new Error(`Path '${config.path}' is a directory, not a file.`);
    }

    if ('content' in data && typeof data.content === 'string') {
      if (data.content === '' || (data as any).encoding === 'none') { // Cast data to any to access encoding property
        console.log(`[getGitHub] File content empty (likely > 1MB). Using exact file SHA: ${data.sha}`);
        try {
          if (data.sha) {
            const { data: blob } = await octokit.rest.git.getBlob({ owner: config.owner, repo: config.repo, file_sha: data.sha });
            console.log(`[getGitHub] Blob fetch successful! Encoding: ${blob.encoding}`);
            if (blob.encoding === 'base64' && typeof blob.content === 'string') {
              const base64 = blob.content.replace(/\n/g, '');
              const binString = atob(base64);
              const bytes = new Uint8Array(binString.length);
              for (let i = 0; i < binString.length; i += 1) bytes[i] = binString.charCodeAt(i);
              return new TextDecoder().decode(bytes);
            }
          }
        } catch (fallbackBlobErr: any) {
          console.error('[getGitHub] Failed direct Blob fallback!', fallbackBlobErr.message);
        }
      }

      try {
        console.log(`[getGitHub] Attempting Buffer Base64 decode for length: ${data.content.length}`);
        // GitHub API returns content as base64 encoded string
        return Buffer.from(data.content, 'base64').toString('utf8');
      } catch (decodeError) {
        console.error('[getGitHub] Decode Buffer error! Falling back to atob.', decodeError);
        const base64 = data.content.replace(/\n/g, '');
        const binString = atob(base64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i += 1) {
          bytes[i] = binString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      }
    } else {
      console.error('[getGitHub] Unexpected format. Content key missing!');
      throw new Error(`File content not found or not in expected format for '${config.path}'.`);
    }
  } catch (err: any) {
    console.error('[getGitHub] Main API exception thrown:', err.status, err.message);

    // Large file logic inside primary catch!
    if (err.status === 403 || err.status === 422 || err.message?.includes('too large')) {
      console.log('[getGitHub] Exception matched large file blob limitation. Using Git Trees fallback...');
      try {
        const { data: branchData } = await octokit.rest.repos.getBranch({ owner: config.owner, repo: config.repo, branch: config.branch });
        const { data: treeData } = await octokit.rest.git.getTree({
          owner: config.owner, repo: config.repo, tree_sha: branchData.commit.sha, recursive: 'true',
        });
        const fileNode = treeData.tree.find((t) => t.path === config.path);

        if (fileNode && fileNode.sha) {
          console.log(`[getGitHub] Tree Node found! SHA: ${fileNode.sha}`);
          const { data: blob } = await octokit.rest.git.getBlob({ owner: config.owner, repo: config.repo, file_sha: fileNode.sha });
          console.log(`[getGitHub] Successful blob fetch. Encoding: ${blob.encoding}`);
          if (blob.encoding === 'base64' && typeof blob.content === 'string') {
            console.log('[getGitHub] Decoding base64 large chunk blob...');
            const base64 = blob.content.replace(/\n/g, '');
            const binString = atob(base64);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i += 1) bytes[i] = binString.charCodeAt(i);
            return new TextDecoder().decode(bytes);
          }
        }
      } catch (fallbackErr: any) {
        console.error('[getGitHub] Git Trees recursive fallback failed!', fallbackErr.message);
      }
    }

    if (err.status === 404) {
      console.log('[getGitHub] Returning empty string. 404 block reached.');
      return ''; // Explicitly requested per previous UI behavior
    }
    throw err;
  }
}
