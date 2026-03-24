# 📊 slidev-addon-bpmn

[![npm version](https://img.shields.io/npm/v/slidev-addon-bpmn)](https://www.npmjs.com/package/slidev-addon-bpmn)
[![license](https://img.shields.io/npm/l/slidev-addon-bpmn)](https://github.com/emaarco/slidev-addon-bpmn/blob/main/LICENSE)

Display BPMN 2.0 diagrams in your [Slidev](https://sli.dev/) presentations. Whether you're presenting workflow designs, explaining process automation, or teaching BPMN concepts — this addon has you covered! 💡

Powered by [bpmn-js](https://bpmn.io/toolkit/bpmn-js/) from bpmn.io.

## 🚀 Quick Start

1. Install the addon in your Slidev project
2. Place your `.bpmn` files in the `public/` folder
3. Use the `<Bpmn>` component in your slides

That's it — your BPMN diagrams are ready to present!

## Example Slide

![Example BPMN diagram in Slidev](./public/example-slide.png)

## 📦 Installation

```bash
npm install slidev-addon-bpmn
```

Then register the addon in your slide's frontmatter:

```yaml
---
addons:
  - slidev-addon-bpmn
---
```

Or in your `package.json`:

```json
{
  "slidev": {
    "addons": ["slidev-addon-bpmn"]
  }
}
```

## 🧩 Components

This addon provides two complementary components for different use cases:

- **`<Bpmn>`** - Static BPMN rendering for PDFs, presentations, and documentation
- **`<BpmnTokenSimulation>`** - Interactive token-based process simulation for live demos

## 🔧 Component Reference

### Bpmn Component

Renders BPMN diagrams as static SVG images. Perfect for PDF exports and presentations.

```vue
<Bpmn
  bpmnFilePath="./my-process.bpmn"
  width="100%"
  height="400px"
/>
```

**Props:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `bpmnFilePath` | `string` | *required* | Path to the `.bpmn` file (relative to `public/`) |
| `width` | `string` | `'100%'` | Maximum width of the diagram |
| `height` | `string` | `'auto'` | Height of the diagram |

### BpmnTokenSimulation Component

Renders interactive BPMN diagrams with token simulation capabilities. Perfect for process walkthroughs and training.

```vue
<BpmnTokenSimulation
  bpmnFilePath="./my-process.bpmn"
  width="100%"
  height="500px"
/>
```

**Props:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `bpmnFilePath` | `string` | *required* | Path to the `.bpmn` file (relative to `public/`) |
| `width` | `string` | `'100%'` | Width of the diagram container |
| `height` | `string` | `'auto'` | Height of the diagram container (defaults to 500px when 'auto') |

The token simulation provides interactive controls for stepping through process execution with animated token flow.

## 💡 Tips

- **File location**: BPMN files must be placed in the `public/` folder
- **Supported formats**: Standard BPMN 2.0 XML files (exported from Camunda Modeler, bpmn.io, etc.)
- **Styling**: Use Tailwind classes on the component element to control sizing
- **Export**: Each `<Bpmn>` component works seamlessly with Slidev's PDF/PNG export features

## 🤝 Contributing

Contributions are welcome! Feel free to report bugs, suggest features via [issues](https://github.com/emaarco/slidev-addon-bpmn/issues), submit pull requests with improvements, or share your ideas and use cases.

To develop locally: clone the repo, run `npm install`, then `npm run dev` to test your changes.

## 🙏 Credits

- [bpmn-js](https://github.com/bpmn-io/bpmn-js) by [bpmn.io](https://bpmn.io/)
- Inspired by [slidev-addon-excalidraw](https://github.com/haydenull/slidev-addon-excalidraw)
- [bavaria-ipsum](https://bavaria-ipsum.de/) - for making the example slide a little more entertaining 🥨