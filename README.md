[![CodeQL](https://github.com/Chanomhub/ChanoX/workflows/CodeQL%20Advanced/badge.svg)](https://github.com/Chanomhub/ChanoX/actions/workflows/codeql-analysis.yml)



# โปรเจกต์ชื่อเดิม (หยุดพัฒนาแล้ว)

⚠️ **โปรเจกต์นี้ถูก archive และหยุดพัฒนาตั้งแต่ [วันที่]**

→ ไปใช้เวอร์ชั่น 2 ตัวใหม่ที่เขียนใหม่ทั้งหมดแทนนะครับ  
👉 [https://github.com/Chanomhub/ChanoX2](https://github.com/Chanomhub/ChanoX2)

ขอบคุณทุกคนที่เคยใช้เวอร์ชั่นเก่ามาก ๆ นะครับ ❤️


## Features

- **Cross-platform support** - Works on Windows, macOS, and Linux
- **Lightning-fast performance** - Built with Tauri for a lightweight footprint
- **Modern tech stack** - React, TypeScript, and Vite for rapid development
- **Seamless integration** - Pre-configured to work with all ChanoX APIs
- **Type-safe development** - Strong typing for maintainable and robust code



### Prerequisites

- [Node.js](https://nodejs.org/) (version specified in `.nvmrc`)
- [Rust](https://www.rust-lang.org/tools/install) (required by Tauri)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation ⚙️

1. Clone the repository:
   ```bash
   git clone https://github.com/ChanoX/ChanoX-Desktop.git
   cd ChanoX
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm run tauri dev
   ```

### Building for Production 🔎

To create a distributable package:

```bash
pnpm run tauri build
```

This will generate platform-specific installers in the `src-tauri/target/release/bundle` directory.

## Development

### Project Structure

```
ChanoX/
├── src/              # React frontend code
├── src-tauri/        # Tauri backend code
├── public/           # Static assets
└── package.json      # Project dependencies and scripts
```


## License 🪪

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 🚉

If you encounter any issues or have questions, please [open an issue](https://github.com/ChanoX/ChanoX-Desktop/issues) on GitHub.

---

Made with ❤️ by the ChanoX community
