---
name: deepbook-release
description: Use when releasing a new version of deepbook-sandbox, the user says "release", "new version", "cut a release", "start release", "bump version for release", or wants to run the full release pipeline (version bump, Docker images, GitHub release)
---

# DeepBook Sandbox Release

Automated release pipeline for `MystenLabs/deepbook-sandbox`. Executes 5 sequential phases with wait points for external processes (PR merges, Docker builds). Gracefully falls back to manual instructions when `gh` CLI is unavailable.

**Repository:** `https://github.com/MystenLabs/deepbook-sandbox`
**DockerHub:** `https://hub.docker.com/u/mysten`

## Phase 0 -- Pre-flight

Run these checks before starting:

1. Verify working directory contains `sandbox/package.json` (abort if not in deepbook-sandbox)
2. Ensure clean working tree on `main`: `git status --porcelain` must be empty
3. Pull latest: `git checkout main && git pull`
4. Read current version: parse `version` field from `sandbox/package.json`
5. Find previous release tag: `git tag -l 'v*' --sort=-version:refname | head -1`
6. **Check `gh` CLI**: run `gh auth status`
   - If succeeds: set `GH_AVAILABLE=true`
   - If fails: inform user that GitHub actions will require manual steps with URLs provided
7. **Ask for new version**: Use `AskUserQuestion` suggesting next patch/minor/major based on current version
8. **Resume detection**: Check if `release/vX.Y.Z` branch or `vX.Y.Z` tag already exists. If so, ask which phase to resume from.

## Phase 1 -- Version Bump PR

Create a PR that bumps `sandbox/package.json` to the new version.

1. Create branch: `git checkout -b release/vX.Y.Z`
2. Edit `sandbox/package.json`: update `"version"` to `X.Y.Z` (no `v` prefix in package.json)
3. Commit (use heredoc for message):
   ```
   bump version to vX.Y.Z

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```
4. Push: `git push -u origin release/vX.Y.Z`
5. Create PR:
   - **With gh:**
     ```bash
     gh pr create --title "bump version to vX.Y.Z" --body "Version bump for release vX.Y.Z"
     ```
   - **Without gh:** Show this URL and ask user to create PR manually:
     ```
     https://github.com/MystenLabs/deepbook-sandbox/compare/main...release/vX.Y.Z
     ```
     PR title: `bump version to vX.Y.Z`
6. **Wait**: `AskUserQuestion` -- "The version bump PR is open. Please review and merge it. Confirm when done."
7. After confirmation: `git checkout main && git pull`

## Phase 2 -- Trigger Docker Image Builds

Dispatch the Docker image build workflow on main.

1. Trigger the workflow:
   - **With gh:**
     ```bash
     gh workflow run sandbox-images-to-dockerhub.yml --ref main
     ```
   - **Without gh:** Ask user to visit this URL and click **"Run workflow"** selecting `main` branch:
     ```
     https://github.com/MystenLabs/deepbook-sandbox/actions/workflows/sandbox-images-to-dockerhub.yml
     ```
2. **Wait**: `AskUserQuestion` -- ask user to monitor DockerHub for the 3 new image tags and provide the new commit hash when ready. Include these links:
   - `https://hub.docker.com/r/mysten/deepbook-sandbox-market-maker/tags`
   - `https://hub.docker.com/r/mysten/deepbook-sandbox-faucet/tags`
   - `https://hub.docker.com/r/mysten/deepbook-sandbox-oracle-service/tags`

   Tag format: `{40-char-commit-hash}-arm64`. Ask: "What is the new commit hash from the Docker image tags?"

## Phase 3 -- Docker Image Tag Update PR

Update `sandbox/docker-compose.yml` with the new image tags.

1. Create branch: `git checkout -b release/vX.Y.Z-images`
2. Edit `sandbox/docker-compose.yml` -- update these 3 image default tags with the new hash:
   - `MARKET_MAKER_IMAGE` default: `mysten/deepbook-sandbox-market-maker:{HASH}-arm64`
   - `FAUCET_IMAGE` default: `mysten/deepbook-sandbox-faucet:{HASH}-arm64`
   - `ORACLE_SERVICE_IMAGE` default: `mysten/deepbook-sandbox-oracle-service:{HASH}-arm64`

   Use the `Edit` tool to replace the old hash in each image line. All 3 services share the same commit hash.
3. Commit:
   ```
   bump faucet, oracle, market-maker images to vX.Y.Z

   Update default Docker image tags for faucet, oracle-service, and
   market-maker to {SHORT_HASH} (arm64 builds).

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```
4. Push: `git push -u origin release/vX.Y.Z-images`
5. Create PR:
   - **With gh:**
     ```bash
     gh pr create --title "bump Docker images to vX.Y.Z" --body "Update default Docker image tags for faucet, oracle-service, and market-maker."
     ```
   - **Without gh:** Show compare URL:
     ```
     https://github.com/MystenLabs/deepbook-sandbox/compare/main...release/vX.Y.Z-images
     ```
6. **Wait**: `AskUserQuestion` -- "The Docker image update PR is open. Please review and merge it. Confirm when done."
7. After confirmation: `git checkout main && git pull`

## Phase 4 -- Create GitHub Release

Generate release notes and create the GitHub release.

1. **Generate notes**: Run `git log --oneline {PREVIOUS_TAG}..HEAD`
2. **Filter**: Remove commits matching (case-insensitive):
   - `bump version`
   - `bump.*image` or `bump.*docker`
3. **Format** release notes as markdown:
   ```markdown
   ## What's New

   **Feature/Fix Name** (#PR)
   Brief description of the change.

   ...

   ## Full Changelog
   https://github.com/MystenLabs/deepbook-sandbox/compare/{PREVIOUS_TAG}...vX.Y.Z
   ```
4. **Review**: Use `AskUserQuestion` to present the draft release notes and ask user to approve or suggest edits
5. Create and push tag:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
6. Create release:
   - **With gh:**
     ```bash
     gh release create vX.Y.Z --title "vX.Y.Z" --notes "RELEASE_NOTES"
     ```
     Use a heredoc for the notes body to preserve formatting.
   - **Without gh:** Show this URL and provide the formatted release notes for the user to paste:
     ```
     https://github.com/MystenLabs/deepbook-sandbox/releases/new?tag=vX.Y.Z
     ```
     Title: `vX.Y.Z`

## Phase 5 -- Trigger Tagged Docker Build

Run the Docker image workflow again, this time linked to the version tag.

1. Trigger:
   - **With gh:**
     ```bash
     gh workflow run sandbox-images-to-dockerhub.yml --ref vX.Y.Z
     ```
   - **Without gh:** Ask user to visit the Actions URL and run the workflow selecting the `vX.Y.Z` tag (or entering `vX.Y.Z` in the tag input field):
     ```
     https://github.com/MystenLabs/deepbook-sandbox/actions/workflows/sandbox-images-to-dockerhub.yml
     ```
2. **Done**: Print summary of everything completed:
   - Version bumped to X.Y.Z
   - Docker images built from main (hash)
   - docker-compose.yml updated
   - Release vX.Y.Z published
   - Tagged Docker build dispatched

## Quick Reference

| Phase | Action | Wait Point |
|-------|--------|------------|
| 0 | Pre-flight checks, version selection | User chooses version |
| 1 | Bump `package.json`, create PR | PR merge |
| 2 | Trigger Docker build workflow | Docker images on DockerHub |
| 3 | Update `docker-compose.yml` tags, create PR | PR merge |
| 4 | Generate notes, create release | User approves notes |
| 5 | Trigger tagged Docker build | None |

## Key Conventions

- **package.json version**: no `v` prefix (`0.3.0`)
- **Git tags**: `v` prefix (`v0.3.0`)
- **Branch names**: `release/vX.Y.Z` (version bump), `release/vX.Y.Z-images` (image tags)
- **Commit style**: lowercase, no prefix, descriptive body
- **All commits** include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
- **Image tag format**: `{40-char-commit-hash}-arm64` -- all 3 sandbox services share the same hash
- **Workflow file**: `.github/workflows/sandbox-images-to-dockerhub.yml`
