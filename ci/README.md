# CI configuration

The GitHub Actions workflow lives here (`github-actions.yml`) because this repo's
push token does not have the `workflows` permission. To enable CI, run once:

```bash
mkdir -p .github/workflows
cp ci/github-actions.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml && git commit -m "ci: enable GitHub Actions" && git push
```

The workflow runs `npm test` on Node 20/22/24, smoke-tests the CLI with the offline
mock provider, and verifies `npm pack`.
