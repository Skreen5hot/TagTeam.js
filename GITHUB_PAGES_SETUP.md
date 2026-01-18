# GitHub Pages Setup Instructions

This repository is configured to automatically deploy a test site to GitHub Pages on every commit to `main`.

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in left sidebar)
3. Under "Build and deployment":
   - **Source:** Select "GitHub Actions"
4. Click **Save**

That's it! The workflow will automatically deploy on the next commit.

### 2. First Deployment

After enabling GitHub Pages, trigger the workflow:

**Option A:** Push a commit to `main`
```bash
git add .
git commit -m "Enable GitHub Pages"
git push origin main
```

**Option B:** Manually trigger the workflow
1. Go to **Actions** tab
2. Click "Deploy to GitHub Pages"
3. Click "Run workflow" → "Run workflow"

### 3. Access Your Site

Once deployed (takes ~2 minutes), your site will be available at:

```
https://<your-username>.github.io/TagTeam.js/
```

Replace `<your-username>` with your GitHub username.

## What Gets Deployed

The GitHub Pages site includes:

1. **Interactive Demo** (`demo.html`)
   - Try TagTeam.js with example scenarios
   - Real-time analysis of ethical dilemmas
   - 4 example scenarios across different domains

2. **Test Suite** (`index.html`)
   - Full Week 2a validation results
   - Shows 100% accuracy on IEE test corpus
   - All 12 dimensions × 5 scenarios = 60 checks

3. **Bundle** (`tagteam.js`)
   - Complete TagTeam.js library (4.18 MB)
   - Includes all Week 2a features

## Workflow Details

**File:** `.github/workflows/deploy-pages.yml`

**Triggers:**
- Every push to `main` branch
- Manual trigger via Actions tab

**Steps:**
1. Checkout repository
2. Setup Node.js 18
3. Run `node build.js` to create bundle
4. Create GitHub Pages directory with:
   - Copied bundle (`tagteam.js`)
   - Test suite as index (`index.html`)
   - Interactive demo (`demo.html`)
5. Deploy to GitHub Pages

## Local Testing

Before pushing, you can test locally:

```bash
# Build the bundle
node build.js

# Open test files in browser
start test-week2a-context.html  # Windows
open test-week2a-context.html   # macOS
xdg-open test-week2a-context.html  # Linux
```

## Troubleshooting

**Site not updating?**
1. Check Actions tab for workflow status
2. Ensure GitHub Pages is set to "GitHub Actions" source
3. Clear browser cache and hard refresh (Ctrl+F5)

**Build failing?**
1. Check Actions tab for error logs
2. Ensure `build.js` runs successfully locally
3. Verify all source files exist in repository

## Updating Content

To update the deployed site:

1. Modify source files (`src/*.js`)
2. Update test files if needed
3. Commit and push to `main`
4. Workflow automatically rebuilds and redeploys

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the repository root with your domain
2. Configure DNS records with your domain provider
3. See [GitHub Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
