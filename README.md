# ChanomHub Desktop Application

A cross-platform desktop application for the ChanomHub community, built with Tauri, React, and TypeScript.

## Overview

ChanomHub Desktop provides a native application experience for interacting with ChanomHub's APIs directly from your desktop. Built on modern technologies, it offers a fast, secure, and seamless experience across Windows, macOS, and Linux.

## Features

- **Cross-platform support** - Works on Windows, macOS, and Linux
- **Lightning-fast performance** - Built with Tauri for a lightweight footprint
- **Modern tech stack** - React, TypeScript, and Vite for rapid development
- **Seamless integration** - Pre-configured to work with all ChanomHub APIs
- **Type-safe development** - Strong typing for maintainable and robust code

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version specified in `.nvmrc`)
- [Rust](https://www.rust-lang.org/tools/install) (required by Tauri)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ChanomHub/ChanomHub.git
   cd ChanomHub
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm run tauri dev
   ```

### Building for Production

To create a distributable package:

```bash
pnpm run tauri build
```

This will generate platform-specific installers in the `src-tauri/target/release/bundle` directory.

## Development

### Project Structure

```
ChanomHub/
├── src/              # React frontend code
├── src-tauri/        # Tauri backend code
├── public/           # Static assets
└── package.json      # Project dependencies and scripts
```


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/ChanomHub/ChanomHub/issues) on GitHub.

---

Made with ❤️ by the ChanomHub community