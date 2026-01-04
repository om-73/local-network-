# Network Monitor

A Wireshark-like web-based network traffic monitor.

## Features
-   **Real-Time Packet Capture**: Visualize live network traffic.
-   **Split-Pane Interface**: Packet List, Details, and Bytes view.
-   **Deep Inspection**: Protocol-level breakdown (Ethernet, IP, TCP/UDP, HTTP).
-   **Mock Mode**: Simulates traffic if standard Wireshark tools are missing.

## Prerequisites
1.  **Node.js**: Installed.
2.  **Wireshark (`tshark`)**: Required for real-time capture.
    ```bash
    brew install wireshark
    ```
3.  **Permissions**: Capturing packets requires elevated privileges.

## How to Run

### Real-Time Mode (Recommended)
To capture live traffic, you must run the server with `sudo`:
```bash
sudo npm start
```
*Enter your mac password when prompted.*

### Demo/Mock Mode
If you don't have Wireshark or sudo access, the app naturally falls back to demo mode:
```bash
npm start
```
(You will see simulated random traffic).

## Troubleshooting
-   **Permission Denied**: If you see "Permission denied" errors, ensure you are using `sudo npm start`.
-   **Fix Permissions Permanently**: You can install the `wireshark-chmodbpf` helper to run without sudo (requires reboot):
    ```bash
    brew install --cask wireshark-chmodbpf
    # REBOOT REQUIRED
    ```
ing System

A real-time, web-based network traffic monitor built with Node.js and Wireshark (tshark). This project visualizes live packet data, protocol distribution, and bandwidth usage on a modern dashboard.

> **WARNING**: This tool is for educational purposes only. Monitoring networks you do not own or have permission to audit is illegal. Run this only on your local network.

## 🚀 Features
- **Real-time Packet Capture**: Live stream of network packets using `tshark`.
- **Interactive Dashboard**: Auto-updating table of Source, Destination, Protocol, and Length.
- **Visual Analytics**: Protocol distribution charts and Top Source IP graphs.
- **Device Discovery**: Scans local network to find connected devices (IP & MAC).
- **Filtering**: Filter traffic by IP or Protocol instantly.
- **Export**: Download captured statistics as JSON.

## 🏗 Architecture

```mermaid
graph TD;
    T[Tshark Process] -->|Spawned Child Process| N[Node.js Backend]
    N -->|Parse Stdout| P[Packet Parser]
    P -->|Emit Event| S[Socket.IO Server]
    S -->|WebSocket| C[Web Client (Dashboard)]
    C -->|HTTP Request| A[Express API]
    A -->|Control| N
    A -->|Get Data| D[Device Scanner / Stats Service]
```

**Tech Stack:**
- **Backend**: Node.js, Express, Socket.IO, Child Process
- **Frontend**: HTML5, CSS3 (Dark Mode), Vanilla JS, Chart.js
- **Packet Engine**: Wireshark (`tshark`)

## 🛠 Prerequisites

1.  **Node.js**: v14+ installed.
2.  **Wireshark**: Must be installed and added to PATH.
    -   **Mac**: `brew install wireshark` (runs tshark automatically)
    -   **Windows**: Install Wireshark and ensure `tshark.exe` is in your System Path.
    -   **Linux**: `sudo apt install tshark`

## 📦 Installation

1.  **Navigate to the backend directory:**
    ```bash
    cd network-monitor/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## ▶️ How to Run

1.  **Start the Server:**
    Since capturing packets requires raw socket access, you must run with **sudo/admin** privileges.

    ```bash
    sudo node server.js
    ```
    *On Windows, run your terminal as Administrator.*

2.  **Open Dashboard:**
    Go to `http://localhost:3000` in your browser.

3.  **Start Monitoring:**
    -   Select your network interface (e.g., `en0` on Mac, `Wi-Fi` on Windows) or leave blank for auto-detect.
    -   Click **Start Capture**.
    -   Watch the packets flow in!

## 🧪 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Error spawning tshark"** | Ensure Wireshark is installed and `tshark` is in your PATH. Try running `tshark -v` in terminal to verify. |
| **No Packets Showing** | You likely need **root/admin privileges**. Restart terminal as Admin or utilize `sudo`. |
| **"Capture already running"** | The server tracks state. Refresh the page or click Stop before Starting again if it got stuck. |
| **Interface not found** | Use `ifconfig` (Mac/Linux) or `ipconfig` (Windows) to find your actual interface name (e.g., `en0`, `eth0`). |

## 📄 Resume / Project Description

**Project Title:** Real-time Network Traffic Monitoring System
**Description:** Designed and implemented a full-stack network analysis tool using Node.js and Wireshark. Engineered a non-blocking packet capture engine using Node.js child processes to interface with `tshark`. Developed a high-performance frontend with Socket.IO for sub-second latency visualization of network traffic. Implemented custom protocol parsers and statistical aggregation algorithms to provide live bandwidth insights and security auditing capabilities.

## 🔮 Future Improvements
- [ ] Save captured packets to `.pcap` file for Wireshark analysis.
- [ ] Add specific filters for port numbers.
- [ ] Implement historical data storage (MongoDB/SQLite).
- [ ] Add alert notifications (Email/SMS) for suspicious IPs.

## ⚖️ License
MIT License.
