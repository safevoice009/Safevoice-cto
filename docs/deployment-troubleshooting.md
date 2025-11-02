# GitHub Pages Deployment Troubleshooting

This guide helps diagnose and fix common GitHub Pages deployment issues for SafeVoice.

## 📋 Quick Checklist

Before troubleshooting, verify:

- [ ] Repository Settings → Pages → Source is set to "GitHub Actions"
- [ ] The `main` branch contains the latest code
- [ ] GitHub Actions workflow has completed successfully
- [ ] Browser cache is cleared when testing
- [ ] DevTools console is open to check for 404 errors

## 🔍 Common Issues and Fixes

### Issue 1: Blank White Page with 404 Errors

**Symptoms:**
- Live URL shows a blank page
- Console shows: `Failed to load resource: the server responded with a status of 404 ()`
- Assets like JS/CSS files are not loading

**Root Causes:**
1. Incorrect base path in Vite configuration
2. Missing or incorrect `homepage` field in package.json
3. Build artifacts not being deployed

**Solution:**

Ensure the following files have the correct base path (`/Safevoice-cto/`):

1. **vite.config.ts**:
   ```typescript
   export default defineConfig(({ mode }) => ({
     plugins: [react()],
     base: mode === 'production' ? '/Safevoice-cto/' : '/',
   }))
   ```

2. **package.json**:
   ```json
   {
     "homepage": "https://safevoice009.github.io/Safevoice-cto/"
   }
   ```

3. **App.tsx** (BrowserRouter):
   ```typescript
   <BrowserRouter basename={import.meta.env.DEV ? '/' : '/Safevoice-cto'}>
   ```

### Issue 2: Client-Side Routes Return 404

**Symptoms:**
- Homepage loads correctly
- Direct navigation to `/feed`, `/profile`, or other routes shows GitHub 404 page
- Clicking internal links works, but refreshing the page breaks

**Root Cause:**
GitHub Pages doesn't support server-side routing for SPAs by default.

**Solution:**

The repository includes a `public/404.html` file that redirects all 404s back to `index.html` with the original path preserved in sessionStorage:

```html
<!-- public/404.html -->
<script>
  (function () {
    var redirectPath = window.location.pathname + window.location.search + window.location.hash;
    try {
      sessionStorage.setItem('safevoice:redirect', redirectPath);
    } catch (error) {
      var normalized = redirectPath.replace(/^\/Safevoice-cto\/?/, '');
      var fallbackUrl = '/Safevoice-cto/' + '#!' + normalized;
      window.location.replace(fallbackUrl);
      return;
    }
    window.location.replace('/Safevoice-cto/');
  })();
</script>
```

The `index.html` file restores the path on load:

```html
<!-- index.html (in <head>) -->
<script>
  (function () {
    try {
      var redirectPath = sessionStorage.getItem('safevoice:redirect');
      if (redirectPath) {
        sessionStorage.removeItem('safevoice:redirect');
        window.history.replaceState(null, '', redirectPath);
      }
    } catch (error) {
      // Ignore sessionStorage errors
    }
  })();
</script>
```

### Issue 3: GitHub Actions Workflow Fails

**Symptoms:**
- Workflow fails with "pages build and deployment" errors
- Permissions issues in workflow logs
- "Resource not accessible by integration" errors

**Root Causes:**
1. Incorrect workflow permissions
2. GitHub Pages not enabled in repository settings
3. Pages source not set to GitHub Actions

**Solution:**

1. **Check Repository Settings:**
   - Go to Settings → Pages
   - Under "Source", select "GitHub Actions"
   - Save changes

2. **Verify Workflow Permissions:**

   The workflow file should have:
   ```yaml
   permissions:
     contents: read
     pages: write
     id-token: write
   ```

3. **Use Official GitHub Pages Actions:**

   The deploy workflow uses:
   - `actions/configure-pages@v5`
   - `actions/upload-pages-artifact@v3`
   - `actions/deploy-pages@v4`

### Issue 4: Old Version of Site is Cached

**Symptoms:**
- Changes pushed to `main` aren't visible on the live site
- Workflow succeeds but site doesn't update

**Solution:**

1. **Hard Refresh:** Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Browser Cache:** DevTools → Application → Clear Storage
3. **Check Workflow Logs:** Verify the workflow deployed the correct commit hash
4. **Wait for CDN:** GitHub Pages uses a CDN; changes may take 1-2 minutes to propagate

### Issue 5: Assets Load but App Doesn't Initialize

**Symptoms:**
- No console errors
- Blank page but HTML loads
- React doesn't mount

**Root Causes:**
1. JavaScript errors during initialization
2. Missing environment variables
3. Wallet provider configuration issues

**Solution:**

1. **Check Console for React Errors:**
   Open DevTools → Console and look for uncaught exceptions.

2. **Verify Environment Variables:**
   - Check if `VITE_WALLETCONNECT_PROJECT_ID` is required
   - Ensure `.env` is not committed but `.env.example` documents required variables

3. **Test Locally:**
   ```bash
   npm run build
   npm run preview
   ```
   Navigate to `http://localhost:4173/Safevoice-cto/` and verify the app works.

## 🚀 Manual Deployment (Fallback)

If GitHub Actions deployment is broken, use manual deployment:

```bash
# Build the project
npm run build

# Deploy using gh-pages CLI
npm run deploy
```

This pushes the `dist/` folder to the `gh-pages` branch.

**Note:** You may need to change the Pages source back to "Deploy from a branch" → `gh-pages` / `root` in repository settings.

## 📊 Debugging Workflow

1. **Check Workflow Status:**
   - Go to Actions tab in GitHub
   - Click on the latest "Deploy to GitHub Pages" workflow
   - Review build logs for errors

2. **Inspect Build Artifacts:**
   - In workflow run, check "Upload artifact" step
   - Download the artifact and inspect `dist/` contents
   - Verify `index.html`, `404.html`, and `assets/` are present

3. **Test Production Build Locally:**
   ```bash
   npm run build
   npm run preview
   ```
   Visit `http://localhost:4173/Safevoice-cto/` and test all routes.

4. **Check GitHub Pages Environment:**
   - Go to Settings → Environments → github-pages
   - Review deployment history
   - Check if deployments are successful

## 🔧 Advanced Troubleshooting

### Verify Base Path in Built Files

After running `npm run build`, check that the generated `dist/index.html` has the correct base path:

```bash
cat dist/index.html | grep -E "(href|src)="
```

Expected output:
```html
<link rel="icon" type="image/svg+xml" href="/Safevoice-cto/favicon.svg" />
<script type="module" crossorigin src="/Safevoice-cto/assets/index-XXX.js"></script>
<link rel="stylesheet" crossorigin href="/Safevoice-cto/assets/index-XXX.css">
```

### Verify 404.html is Deployed

Check the live 404 page:
```
https://safevoice009.github.io/Safevoice-cto/this-page-does-not-exist
```

It should redirect to the homepage without showing the default GitHub 404 page.

### Check Browser Network Tab

1. Open DevTools → Network tab
2. Refresh the page
3. Check for failed requests (red status codes)
4. Verify assets are loading from the correct path (`/Safevoice-cto/assets/...`)

## 📝 Prevention Checklist

To prevent deployment issues in the future:

- [ ] Always test production builds locally with `npm run preview`
- [ ] Verify deep links work before merging to `main`
- [ ] Use `npm ci` instead of `npm install` in CI for reproducible builds
- [ ] Keep dependencies up to date
- [ ] Monitor GitHub Actions workflow runs
- [ ] Document any changes to base path or repository name

## 🆘 Getting Help

If issues persist after following this guide:

1. Check the [Vite GitHub Pages deployment guide](https://vitejs.dev/guide/static-deploy.html#github-pages)
2. Review [GitHub Pages documentation](https://docs.github.com/en/pages)
3. Inspect recent commits for breaking changes
4. Test with a minimal reproduction in a separate branch

## ✅ Success Criteria

After deployment, verify:

- [ ] Homepage loads at `https://safevoice009.github.io/Safevoice-cto/`
- [ ] No 404 errors in console
- [ ] All assets (JS, CSS, images) load successfully
- [ ] Client-side routes (`/feed`, `/profile`, etc.) work on direct navigation
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Token features are functional
- [ ] Mobile responsive design renders correctly
