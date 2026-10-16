# ibsolutionsglobal.com

The website of IB Solutions Global (Implant Business Solutions), Accra:
IBS Business Management and IBS Haulage.

A static site with no build step. To publish it, run the "Deploy website"
workflow from the Actions tab: it uploads `index.html` and the `assets/`
folder to the web root over FTPS. The secrets it needs are listed at the
top of `.github/workflows/deploy.yml`. Uploading the same files by hand
works too.

- `index.html`: the page
- `assets/css/site.css`: styles (light and dark themes follow the visitor's device)
- `assets/js/site.js`: the mobile menu
- `assets/img/`: logo, favicons and the link-preview image

© Implant Business Solutions. All rights reserved.
