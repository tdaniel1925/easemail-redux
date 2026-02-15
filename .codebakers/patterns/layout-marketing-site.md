# PATTERN: Marketing Site & Landing Pages

## When to Use
Any project that needs a public-facing marketing site, landing pages, blog, or conversion-optimized pages alongside the app.

## Architecture

### Route Structure
```
app/
├── (marketing)/              ← public marketing pages (no auth)
│   ├── layout.tsx            ← marketing layout (navbar + footer)
│   ├── page.tsx              ← homepage / landing page
│   ├── pricing/page.tsx
│   ├── features/page.tsx
│   ├── about/page.tsx
│   ├── contact/page.tsx
│   ├── blog/
│   │   ├── page.tsx          ← blog index
│   │   └── [slug]/page.tsx   ← individual posts
│   ├── legal/
│   │   ├── privacy/page.tsx
│   │   └── terms/page.tsx
│   └── [slug]/page.tsx       ← dynamic CMS pages
├── (app)/                    ← authenticated app (behind auth)
│   ├── layout.tsx            ← app layout (sidebar + header)
│   └── dashboard/page.tsx
```

### Marketing Layout
```typescript
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

## Landing Page Sections (Build Order)

### 1. Hero
- Headline (6-10 words, benefit-focused)
- Subheadline (1-2 sentences explaining what it does)
- Primary CTA button (high contrast, action verb)
- Secondary CTA (text link or ghost button)
- Hero image, screenshot, or video
- Social proof line ("Trusted by 500+ teams")

### 2. Logos / Social Proof Bar
- 5-8 customer or partner logos
- Grayscale, consistent height
- "Trusted by" or "Featured in" label

### 3. Features Grid
- 3-6 features with icon + title + description
- Bento grid or card layout
- Each feature links to detailed section below

### 4. Feature Deep-Dives
- 2-3 sections alternating image-left/image-right
- Screenshot or illustration of the feature
- 3-4 bullet points of benefits
- Mini CTA per section

### 5. Stats / Metrics
- 3-4 big numbers: "10K+ users", "99.9% uptime", "50% faster"
- Animated count-up on scroll

### 6. Testimonials
- 2-3 customer quotes with name, title, company, photo
- Star rating if applicable
- Carousel or grid

### 7. Pricing
- 2-4 tiers in card layout
- Highlight recommended tier
- Feature comparison checkmarks
- Annual/monthly toggle
- CTA per tier
- "All plans include..." section below

### 8. FAQ
- 6-10 questions in accordion
- Schema.org FAQ markup for SEO

### 9. Final CTA
- Repeat headline and primary CTA
- Create urgency or reinforce value

### 10. Footer
- Logo + tagline
- Link columns: Product, Company, Resources, Legal
- Social media icons
- Newsletter signup
- Copyright + legal links

## SEO Requirements

### Every Marketing Page Must Have
```typescript
// Metadata per page
export const metadata: Metadata = {
  title: 'Page Title — Brand Name',
  description: '150-160 character description with primary keyword',
  openGraph: {
    title: 'Page Title — Brand Name',
    description: 'Same or similar description',
    images: [{ url: '/og/page-name.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};
```

### Technical SEO
- Generate sitemap.xml (next-sitemap or app/sitemap.ts)
- Generate robots.txt
- Structured data (JSON-LD) for Organization, Product, FAQ, Blog posts
- Canonical URLs on every page
- Alt text on every image
- H1 → H2 → H3 hierarchy (one H1 per page)
- Internal linking between related pages
- 404 page with search and popular links
- Lighthouse SEO score ≥ 95

### Blog (if spec includes blog)
```typescript
// MDX or Supabase-backed blog
// app/(marketing)/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.coverImage] },
  };
}
```

## Conversion Optimization

### CTA Buttons
- Primary: solid, high contrast, action verb ("Start Free Trial", "Get Started")
- Never "Submit" or "Click Here"
- Add micro-copy below: "No credit card required" or "Free for 14 days"

### Forms
- Minimum fields (name + email for lead gen)
- Single column
- Inline validation
- Loading state on submit
- Success state (don't just redirect — confirm what happened)

### Performance
- Images: WebP/AVIF, lazy load below fold, priority load hero image
- Fonts: subset, preload, font-display: swap
- Above-the-fold content loads in < 1.5s
- Lighthouse Performance ≥ 90

## Animations (Framer Motion)
```typescript
// Fade up on scroll
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5 }}
>

// Staggered children
<motion.div variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
  {items.map(item => (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} />
  ))}
</motion.div>
```

## Rules
- Marketing pages are STATIC (generateStaticParams or SSG) — no client-side data fetching
- Marketing layout is completely separate from app layout
- No auth required for any marketing page
- Mobile-first — 60%+ of marketing traffic is mobile
- Every page has a clear single CTA
- No lorem ipsum — generate realistic copy from the spec
- Images use next/image with proper width/height
- Cookie consent banner if required by region
