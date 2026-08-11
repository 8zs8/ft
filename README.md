# FileTransfer - Frontend

FileTransfer Web UI frontend - a modern, responsive web interface for direct phone-to-PC file transfer.

## Features

- 🔐 **Password Authentication** - SHA-256 hashed passwords, session-based auth
- 📁 **File Browser** - Navigate all computer drives and directories
- ⬆️ **Upload** - Click or drag-and-drop file upload with progress tracking
- ⬇️ **Download** - Download files with progress bar and speed display
- 💾 **Drive Overview** - View all drives with capacity and usage indicators
- 🔗 **Connection Info** - Display LAN and tunnel URLs with copy-to-clipboard
- 📱 **QR Code** - Scan QR code to access from mobile devices
- ⚠️ **Connection Monitor** - Automatic detection of server disconnection
- 🎨 **Modern UI** - Gradient design, responsive layout, mobile-friendly

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | Authenticate with password |
| `/api/logout` | POST | End session |
| `/api/info` | GET | Get server info (URLs, version) |
| `/api/drives` | GET | List all available drives |
| `/api/list?path=...` | GET | List files in directory |
| `/api/upload` | POST | Upload files (multipart/form-data) |
| `/api/download?path=...` | GET | Download a file |
| `/api/qrcode` | GET | Generate QR code for access URL |

## Tech Stack

- Pure HTML / CSS / JavaScript (no framework dependencies)
- Fetch API with AbortController for download progress
- XMLHttpRequest for upload progress
- ReadableStream API for chunked download tracking
- Responsive design with CSS Grid
- Emoji-based file icons

## Deployment

This frontend is designed to work with the FileTransfer backend server:
- [file_transfer.py](https://github.com/8zs8/ft) - Python HTTP server
- C++ Qt server (fileserver.cpp)

Place these files in the same directory structure on the server, or serve them as static files.

## File Structure

```
frontend/
├── login.html      # Login page
├── index.html      # Main application
├── css/
│   └── style.css   # All styles
└── js/
    └── app.js      # All JavaScript logic
```

## License

FileTransfer v2.0
