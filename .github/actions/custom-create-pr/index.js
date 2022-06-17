const core = require('@actions/core');
const github = require('@actions/github');

let octokit;

async function execAction() {
  try {
    const sourceBranch = core.getInput('source_branch', {required: true });
    const targetBranch = core.getInput('target_branch', {required: true });
    const githubToken = core.getInput('github_token', {required: true });
    const label = core.getInput('label');

    console.log(`Merge from ${sourceBranch} into ${targetBranch}`);
    
    const prName = `Autogenerated - Merge from ${sourceBranch} into ${targetBranch}`;

    core.setOutput("pr_name", prName);

    octokit = new github.getOctokit(githubToken);

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    console.log(owner);
    console.log(repo);

    var hasDiffs = await hasBranchDifferences(owner, repo, sourceBranch, targetBranch);
    if (hasDiffs) {
      const { data: pullRequest } = await octokit.rest.pulls.create({
        owner,
        repo,
        head: sourceBranch,
        base: targetBranch,
        title: prName
      });

      await addLabel(owner, repo, pullRequest.number, label);

      console.log('Created pr data:');
      console.dir(pullRequest);

      const payload = JSON.stringify(github.context.payload, undefined, 2);
      console.log(`The event payload: ${payload}`);
    }
    else {
      console.log('No file differences - pr not created');
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

async function addLabel(owner, repo, issue_number, label) {
    console.log('adding label');
    // Create label
    let labelFound = false;
    try {
      var existingLabel = await octokit.rest.issues.getLabel({
        owner,
        repo,
        name: label,
      });
      labelFound = true;
    } catch (error) {
      console.log(error.message);
    }

    console.log('Found label: ');
    console.dir(existingLabel);

    if (labelFound === false) {
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name: label,
        color: '27ff28',
        description: 'Pull requests marked with this label will be auto merged on approval'
      })
    }

    // Add to pr
    if (label) {
      console.log(`Adding label: ${label}`)
      octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [label]
      });
    }
}

async function hasBranchDifferences(owner, repo, sourceBranch, targetBranch) {
  console.log('Checking for branch differences');
  const basehead = `${targetBranch}...${sourceBranch}`;
  console.log(basehead);

  const { data: output } = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead
  });

  console.dir(output);
  return output.files.length > 0;
}

execAction();