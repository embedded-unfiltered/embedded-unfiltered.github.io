# Embedded Unfiltered - Engineer's Toolkit

A collection of unfiltered, no-nonsense web tools for embedded systems engineers, firmware developers, and hardware enthusiasts. Built with vanilla HTML/CSS/JS for speed, reliability, and offline capability.

**[Live Website](https://embedded-unfiltered.github.io/)**

## 🛠️ Tool Catalog

### 🔢 Calculators & Converters
| Tool | Use Case |
|------|----------|
| **Programmer Calculator** | Bitwise operations, hex/bin/dec conversions, and registered field extraction. |
| **Timer Period** | Calculate timer registers (ARR/PSC) for STM32/AVR based on target frequency. |
| **Baud Rate Error** | Check UART reliability by calculating actual baud rate vs clock division. |
| **Base Converter** | Quick conversion between Binary, Octal, Decimal, and Hexadecimal. |
| **Voltage Divider** | Calculate Vout, R1, or R2. Find nearest E-series standard resistor. |
| **LED Resistor** | Calculate series resistor for LEDs based on Vf and If supply. |

### 💾 Memory & Data Types
| Tool | Use Case |
|------|----------|
| **Struct Size** | Calculate C struct padding, alignment, and total size on different architectures. |
| **Endianness** | Visualize and convert data between Little-Endian and Big-Endian formats. |
| **Flash Page Map** | Map variable addresses to Flash sectors/pages for bootloader/EEPROM work. |
| **Buffer Size** | Calculate circular buffer indices and memory usage. |
| **Flash vs RAM** | Compare memory footprints and execution locations. |

### ⚡ Electrical & Analog
| Tool | Use Case |
|------|----------|
| **ADC Resolution** | Calculate LSB voltage, quantization error, and SNR for N-bit ADCs. |
| **Battery Life** | Estimate runtime based on battery capacity (mAh) and sleep/active currents. |
| **PWM Calculator** | Visualize PWM signals, calculate duty cycle % vs counts. |
| **Pull Up/Down** | Calculate I/O line states and current leakage with pull resistors. |
| **Power Model** | Advanced battery modeling with weighted average current profiles. |

### 📡 Communication & Protocols
| Tool | Use Case |
|------|----------|
| **CRC Calculator** | Custom CRC-8/16/32 calculator with poly/init/ref options. |
| **Binary Packet** | Visualize and construct raw binary packets for drivers. |
| **Bit Mask** | Generate #define macros and masks for register bit fields. |
| **Register Field** | Extract and decode values from 32-bit register dumps. |
| **MQTT Topic** | Validate and structure MQTT topic hierarchies. |
| **UUID Generator** | Generate V4 UUIDs for BLE services or unique device IDs. |

### ⏱️ Timing & IO
| Tool | Use Case |
|------|----------|
| **RTOS Tick** | Convert ms/us to RTOS ticks and vice versa. |
| **Watchdog** | Calculate watchdog timeout intervals and prescaler settings. |
| **Clock Tree** | Simpler PLL calculator to find system clock from crystal input. |
| **Epoch Converter** | Convert Unix timestamps to human-readable dates and back. |
| **Logic Solver** | Analyze logic gates, truth tables, and simplify Boolean expressions. |

### 📦 Assets & Parsing
| Tool | Use Case |
|------|----------|
| **Image to C** | Convert bitmaps/images into C arrays (Hex/Bin) for OLED/LCD displays. |
| **Font to C** | Generate C font bitmaps from TTF/OTF files for graphics libraries. |
| **String Length** | Count characters, bytes, and words (useful for buffer allocation). |
| **Text Compare** | Diff tool to compare config files, hex dumps, or code snippets. |
| **JSON Builder** | Escape/Unescape JSON strings for C code embedding. |
| **Encoding** | Convert text between ASCII, UTF-8, and Hex. |

### 🔬 Component Decoders
| Tool | Use Case |
|------|----------|
| **Passive Decoder** | Decode SMD resistor codes, color bands, and capacitor markings. |
| **Segment Display** | Interactive 7, 14, and 16-segment display generator for hex codes. |
| **PID Simulator** | Visualize and tune PID controller response (P, I, D gains). |

## 🚀 Deployment

This project is hosted on GitHub Pages. Any push to the `main` branch automatically deploys the latest version.

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.
3. Submit a Pull Request.

**License**: MIT
