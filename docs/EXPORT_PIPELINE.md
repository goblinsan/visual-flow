# Export Pipeline Documentation

## Overview

The Export Pipeline allows you to export your visual designs to various formats for building real applications. Exported formats include:

1. **JSON Canonical** - Lossless export for version control and round-trip import
2. **React + Tailwind** - Runnable React components with Tailwind CSS
3. **Design Tokens (JSON)** - Design tokens in style-dictionary format
4. **Design Tokens (CSS)** - Design tokens as CSS custom properties

## Using the Export Dialog

### Opening the Export Dialog

1. Click the **File** menu in the header
2. Select **Export…** (or press ⇧⌘E)

### Exporting Your Design

1. **Choose Export Format**
   - Select one of the four available export formats
   - Each format shows a description of its purpose

2. **Configure Options**
   - For React exports: set the component name and toggle comments
   - Preview the generated code in the code viewer

3. **Export Actions**
   - **Copy to Clipboard**: Copy the generated code
   - **Download File**: Download as a file with appropriate extension

## Export Formats

### 1. JSON Canonical Export

**Purpose**: Lossless export for version control and round-trip import

**Features**:
- Preserves all design data without loss
- Includes metadata (timestamp, export version, schema version)
- Stable serialization with sorted keys for better git diffs
- Round-trip validation ensures import produces identical spec

**Output Example**:
```json
{
  "metadata": {
    "exportedAt": "2026-02-08T05:15:00.000Z",
    "exportVersion": "1.0.0",
    "schemaVersion": "1.0.0"
  },
  "spec": {
    "version": "1.0.0",
    "root": {
      "id": "root",
      "type": "frame",
      "size": { "width": 800, "height": 600 },
      "children": []
    }
  }
}
```

**Use Cases**:
- Version control in git
- Backup and restore
- Sharing designs between users
- Migration between versions

### 2. React + Tailwind Export

**Purpose**: Generate runnable React components with Tailwind CSS styling

**Features**:
- Generates TypeScript functional components
- Uses Tailwind CSS classes for styling
- Inline styles for exact positioning and sizing
- Supports all node types (frame, stack, grid, rect, text, image, etc.)
- Configurable component name
- Optional code comments

**Output Example**:
```tsx
import React, type FC from 'react';

export const DesignComponent: FC = () => {
  return (
    <div className="relative" style={{ width: '800px', height: '600px' }}>
      {/* Frame: Main Layout */}
      <div className="flex flex-col" style={{ gap: '10px' }}>
        <div className="text-2xl font-bold">Hello World</div>
        <div className="rounded" style={{ backgroundColor: '#ff0000', width: '100px', height: '100px' }}></div>
      </div>
    </div>
  );
};
```

**Use Cases**:
- Prototyping web applications
- Converting designs to code
- Creating component libraries
- Learning React patterns

**Supported Node Types**:
- **Layout**: frame, stack, grid, group
- **Shapes**: rect, ellipse, polygon, line, curve
- **Content**: text, image

### 3. Design Tokens (JSON)

**Purpose**: Extract design tokens for consistent styling across applications

**Features**:
- Extracts colors, typography, spacing, border radius, opacity
- Semantic naming (e.g., `primary-red`, `text-lg`, `spacing-4`)
- Compatible with style-dictionary
- Deduplicates similar values
- Includes usage counts

**Output Example**:
```json
{
  "color": {
    "primary-red": {
      "value": "#ff0000",
      "type": "color",
      "description": "Used 3 times"
    },
    "neutral-white": {
      "value": "#ffffff",
      "type": "color",
      "description": "Used 1 time"
    }
  },
  "typography": {
    "text-2xl": {
      "value": { "fontSize": "24px" },
      "type": "typography",
      "description": "Used 2 times"
    }
  },
  "spacing": {
    "spacing-4": {
      "value": "16px",
      "type": "spacing",
      "description": "Used 5 times"
    }
  }
}
```

**Use Cases**:
- Building design systems
- Maintaining consistent styling
- Integration with style-dictionary
- Sharing design values between platforms

### 4. Design Tokens (CSS)

**Purpose**: Export design tokens as CSS custom properties for immediate use

**Features**:
- Generates CSS custom properties (CSS variables)
- Ready to use in any CSS/SCSS file
- Semantic naming
- Organized by token type

**Output Example**:
```css
:root {
  --primary-red: #ff0000;
  --neutral-white: #ffffff;
  --text-2xl-size: 24px;
  --spacing-4: 16px;
  --radius-md: 8px;
  --opacity-50: 0.5;
}
```

**Use Cases**:
- Quick integration into existing CSS
- Prototyping with design tokens
- Theming applications
- Responsive design

## Programmatic Usage

### JSON Export

```typescript
import { exportToJSON, importFromJSON, validateRoundTrip } from './export/canonicalExport';

// Export
const json = exportToJSON(spec, {
  pretty: true,
  includeMetadata: true,
  sortKeys: true,
});

// Import
const spec = importFromJSON(json);

// Validate round-trip
const result = validateRoundTrip(spec);
if (!result.valid) {
  console.error('Round-trip validation failed:', result.errors);
}
```

### React Export

```typescript
import { exportToReact } from './export/reactExporter';

const code = exportToReact(spec, {
  componentName: 'MyComponent',
  typescript: true,
  functional: true,
  comments: true,
});

console.log(code); // TypeScript React component code
```

### Design Tokens Export

```typescript
import { 
  extractDesignTokens,
  exportToStyleDictionary,
  exportToCSS 
} from './export/designTokens';

// Extract tokens
const tokens = extractDesignTokens(spec, {
  semantic: true,
  deduplicate: true,
});

// Export as style-dictionary JSON
const jsonTokens = exportToStyleDictionary(tokens);

// Export as CSS
const cssTokens = exportToCSS(tokens);
```

## Semantic Naming Conventions

The export pipeline uses semantic naming for design tokens:

### Colors
- `primary-*` - Most frequently used colors
- `accent-*` - Less frequently used colors
- `neutral-*` - Grayscale colors (black, white, gray)
- `success-green`, `warning-yellow`, `primary-red`, `primary-blue` - Named colors

### Typography
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc. - Font sizes

### Spacing
- `spacing-0` through `spacing-12` - Common spacing values

### Border Radius
- `radius-none`, `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`, `radius-full`

### Opacity
- `opacity-0`, `opacity-25`, `opacity-50`, `opacity-75`, `opacity-100`

## Round-Trip Validation

The JSON export format guarantees lossless round-trip:

```typescript
const original = spec;
const exported = exportToJSON(original, { includeMetadata: false });
const reimported = importFromJSON(exported);

// original === reimported (deep equality)
```

The `validateRoundTrip()` function verifies this and provides detailed error messages if validation fails.

## Best Practices

1. **Version Control**
   - Use JSON export for committing designs to git
   - Enable `sortKeys` for consistent diffs

2. **Code Generation**
   - Use React export as a starting point
   - Refine generated code as needed
   - Extract reusable components

3. **Design Systems**
   - Use Design Tokens export to maintain consistency
   - Integrate with style-dictionary for multi-platform tokens
   - Update tokens when designs change

4. **Collaboration**
   - Share JSON exports for design review
   - Use tokens to align with developers
   - Export React components for implementation reference

## Limitations

- React export generates basic components; complex interactions need manual implementation
- SVG elements (line, curve, polygon) are exported as inline SVG
- Design tokens extraction is based on frequency and heuristics
- Some advanced node properties may use inline styles instead of Tailwind classes

## Future Enhancements

- Vue.js component export
- SwiftUI export
- Roblox Luau export
- Figma plugin export
- Advanced React patterns (hooks, context, state management)
- Theme variants (light/dark mode)
