# iQcare Vercel deployment

## Deploy

1. Upload this project to a GitHub repository or import the ZIP into a local repository.
2. In Vercel, create a new project from the repository.
3. Keep the detected framework as Vite. Use `pnpm build` as the build command and `dist/public` as the output directory if Vercel asks for one.
4. Deploy with HTTPS enabled by default.
5. Replace the example domain in `client/public/sitemap.xml` and `client/public/robots.txt` with the final Vercel domain.
6. Test camera/gallery permissions from the HTTPS URL on an Android/iQOO phone.

## Real photo flow

On HTTPS, the caregiver can open the **Share a photo** action, select the camera or gallery, preview the compressed image, add a caption, and send it into the shared Grandma view. In this static prototype, the image remains in the active browser session. It is not automatically delivered to another browser or stored permanently.

## Production upgrade

For multi-user delivery, add an authenticated API and private object storage. Never put database, storage, telephony, or AI keys in `client/src`. Use Vercel environment variables and server functions for those integrations.
