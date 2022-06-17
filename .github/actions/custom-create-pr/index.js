const core = require('@actions/core');
const github = require('@actions/github');


async function execAction() {
  try {
    const sourceBranch = core.getInput('source_branch', {required: true });
    const targetBranch = core.getInput('target_branch', {required: true });
    const githubToken = core.getInput('github_token', {required: true });

    console.log(`Merge from ${sourceBranch} into ${targetBranch}`);
    
    const prName = `Autogenerated - Merge from ${sourceBranch} into ${targetBranch}`;

    core.setOutput("pr_name", prName);

    const octokit = new github.getOctokit(githubToken);

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    console.log(owner);
    console.log(repo);

    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner,
      repo,
      head: sourceBranch,
      base: targetBranch,
      title: prName
    });

    console.log('Created pr data:');
    console.dir(pullRequest);

    // Create label
    octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pullRequest.number,
      labels: [ { name: 'automerge'}]
    });

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

execAction();