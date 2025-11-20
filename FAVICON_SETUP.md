# Favicon Setup Guide

## What Was Added

A favicon has been created for your Jamaican marketplace site featuring:
- Green background (representing fresh produce)
- Gold accents (Jamaican colors)
- Fresh produce basket with fruits (banana, orange, apple)
- Professional, scalable SVG format

## Files Created

1. **`public/favicon.svg`** - Modern SVG favicon (scalable, works in all modern browsers)
2. Updated **`index.html`** - Added favicon links

## Additional Favicon Formats (Optional)

For better browser compatibility, you can generate additional formats:

### Generate PNG Favicon (16x16, 32x32)

You can use online tools like:
- https://realfavicongenerator.net/
- https://favicon.io/

Or create manually:
1. Export the SVG as PNG at 32x32 pixels
2. Save as `public/favicon.png`
3. Create `favicon.ico` (16x16, 32x32, 48x48 sizes)

### Generate Apple Touch Icon

Create a 180x180 PNG version:
- Save as `public/apple-touch-icon.png`

## Current Setup

The HTML now includes:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

## Testing

After rebuilding, check:
1. Browser tab should show the favicon
2. Bookmarks will use the favicon
3. Mobile home screen (if added) will use apple-touch-icon

## Rebuild Required

After adding favicon files, rebuild:
```bash
npm run build:admin
```

The favicon will be copied to the `dist/` folder automatically by Vite.

## Customization

To customize the favicon:
1. Edit `public/favicon.svg`
2. Change colors, shapes, or add your logo
3. Rebuild: `npm run build:admin`

## Colors Used

- **Green (#1a7a3e, #2d5016)**: Fresh produce, nature
- **Gold (#ffd700)**: Jamaican colors, premium quality
- **Orange (#ff8c00)**: Citrus fruits
- **Red (#ff4444)**: Apples, fresh produce
- **Brown (#8b4513)**: Market basket

