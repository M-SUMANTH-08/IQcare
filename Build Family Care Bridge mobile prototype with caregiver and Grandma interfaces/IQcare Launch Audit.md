# IQcare Launch Audit

## Requested launch checklist

| Requirement | Current status | Required action |
|---|---|---|
| Privacy policy | Missing | Add `/privacy` page and link in footer |
| Terms and conditions | Missing | Add `/terms` page and link in footer |
| Secrets off frontend | Static prototype has no secret backend | Keep AI/storage/telephony keys server-side when backend is added |
| HTTPS | Vercel supports HTTPS | Deploy and verify redirect/canonical origin |
| Cookie consent | Missing | Add consent for analytics only; do not block essential app state |
| Meta title/description | Partial | Add canonical, Open Graph, Twitter metadata |
| Social preview image | Missing | Add branded preview image after logo approval |
| Favicon | Missing | Generate from approved IQcare logo |
| Sitemap/robots | Missing | Add small static files for public routes |
| Image alt text | Partial | Audit every caregiver/Grandma image and upload |
| Image compression | Partial | Compress supplied and captured photos before upload |
| Page-load speed | Not audited | Run Lighthouse after final build |
| Color contrast | Needs new palette audit | Verify yellow-on-white and blue-on-black combinations |
| Mobile friendly | Existing prototype is responsive | Re-test 360px, 390px, 412px, and tablet widths |
| Custom 404 | Existing route exists | Update it with approved visual system and escape CTA |
| Broken links | Needs audit | Test all routes, buttons, and external links |
| Form validation | Partial | Add photo type/size/caption and onboarding validation |
| Spam/bot protection | Missing | Add server-side rate limits and upload throttles |
| Analytics | Placeholder only | Configure privacy-safe analytics after consent |
| One clear CTA | Partial | Make `Start the care demo` the primary public CTA |

## Performance checklist

| Item | IQcare action |
|---|---|
| Cache API responses | Add cache headers for safe metadata and signed media responses |
| Load balancer | Not needed for the prototype; Vercel handles edge routing |
| Index database | Add indexes for `care_circle_id`, `elder_id`, `created_at`, and message status |
| Compress images | Browser compression plus server normalization |
| Loading skeletons | Add for dashboard and photo preview upload states |
| Cache expensive queries | Cache care-circle timeline queries where appropriate |
| N+1 queries | Use joined or batched timeline queries |
| Debounce input | Debounce caption/search inputs where necessary |
| Code splitting | Lazy-load IVR, charts, photo viewer, and policy pages |
| CDN | Vercel edge/CDN plus object-storage CDN for signed media |
| Server-side caching | Add only for non-sensitive public metadata |
| Pagination | Paginate long care timelines |
| Lighthouse | Run mobile and desktop audit before submission |
| Minify JS/CSS | Vite production build already minifies |
| Lazy loading | Lazy-load photo viewer and below-fold images |
| Defer analytics | Load analytics only after consent |
| Unused dependencies | Review package graph before final ZIP |
| Connection pooling | Relevant only after adding a managed backend |

## Important limitation

The current project is a static prototype. The requested launch checklist is a production checklist. The Vercel frontend can satisfy the static items immediately, but real multi-user photo delivery, authentication, private storage, rate limiting, and server-side secrets require a backend service.
