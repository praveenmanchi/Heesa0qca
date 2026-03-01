# Style Guide Tab Technical Documentation

The Style Guide Tab automates the creation of high-fidelity documentation frames directly on the Figma canvas, showcasing colors and typography in a structured layout.

## 📌 Functionality Overview
- **Automated Layout**: Organizes swatches and specimens using Figma's Auto Layout.
- **Thematic Specimens**: Displays tokens resolved against specific themes (e.g., Light, Dark).
- **Resource Linking**: Adds external links to design guidelines or developer portals.
- **Zeroheight Export**: Seamlessly syncs generated guide data to Zeroheight.

## 🛠 Technical Implementation

### IPC Generation Request
The UI sends the currently resolved theme data to the Controller to start the generation process.

```tsx
// StyleGuideTab.tsx
const handleGenerate = useCallback(async () => {
    await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.GENERATE_STYLE_GUIDE,
        themeData,
    });
}, [themeData]);
```

### Font Loading Lifecycle
Generating typography specimens requires all fonts to be loaded into the Figma runtime memory first.

```typescript
// styleGuideGenerator.ts
async function loadFonts() {
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Geist Mono', style: 'Medium' }),
    // ... others
  ]);
}
```

### Auto Layout Logic
The generator uses the Figma API to programmatically set Auto Layout properties for the generated frames.

```typescript
// snippet from generator
container.layoutMode = 'VERTICAL';
container.itemSpacing = 40;
container.paddingTop = 80;
container.layoutSizingHorizontal = 'FILL';
```

## 📡 API Usage

### Figma Plugin API
- **`figma.currentPage.appendChild`**: Used to insert the generated frames.
- **`figma.createText` & `figma.createFrame`**: Core creation nodes.
- **`figma.viewport.scrollAndZoomIntoView`**: Focuses the user's view on the new guide after generation.

### IPC Protocol
| Message Type | Direction | Purpose |
| --- | --- | --- |
| `GENERATE_STYLE_GUIDE` | UI -> Plugin | Starts the generation of a new Style Guide frame. |
| `UPDATE_STYLE_GUIDE` | UI -> Plugin | Refreshes content within the existing 'Style Guide' frame. |

## 💡 Key Information for Developers
- **Naming Convention**: The generator looks for a frame named exactly "Style Guide" to handle updates.
- **Color Conversion**: The generator uses `convertToFigmaColor` to translate web-style colors (hex/rgba) into Figma's 0-1 scale.
- **Theming**: The guide always reflects the tokens of the *first* selected theme if multiple themes are selected in the UI.
