/**
 * Static IC Data Store
 * Embedded to ensure offline compatibility without local server constraints.
 */
const IC_DATA = {
    "ATmega328P-PU": {
        meta: {
            name: "ATmega328P-PU",
            package: "DIP-28",
            datasheet: "https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf",
            description: "High-performance picoPower 8-bit AVR RISC-based microcontroller."
        },
        pins: [
            { n: 1, name: "PC6", type: "RESET", func: ["RESET", "PCINT14"], desc: "Reset Input (Active Low)" },
            { n: 2, name: "PD0", type: "IO", func: ["RXD", "PCINT16"], desc: "USART Receive" },
            { n: 3, name: "PD1", type: "IO", func: ["TXD", "PCINT17"], desc: "USART Transmit" },
            { n: 4, name: "PD2", type: "IO", func: ["INT0", "PCINT18"], desc: "External Interrupt 0" },
            { n: 5, name: "PD3", type: "IO", func: ["INT1", "PCINT19", "OC2B"], desc: "Ext Int 1 / PWM Timer 2B" },
            { n: 6, name: "PD4", type: "IO", func: ["XCK", "T0", "PCINT20"], desc: "Timer 0 Ext Clock" },
            { n: 7, name: "VCC", type: "POWER", func: [], desc: "Digital Supply Voltage" },
            { n: 8, name: "GND", type: "POWER", func: [], desc: "Ground" },
            { n: 9, name: "PB6", type: "IO", func: ["XTAL1", "TOSC1", "PCINT6"], desc: "Crystal Input / Osc 1" },
            { n: 10, name: "PB7", type: "IO", func: ["XTAL2", "TOSC2", "PCINT7"], desc: "Crystal Output / Osc 2" },
            { n: 11, name: "PD5", type: "IO", func: ["T1", "OC0B", "PCINT21"], desc: "Timer 1 Ext / PWM Timer 0B" },
            { n: 12, name: "PD6", type: "IO", func: ["AIN0", "OC0A", "PCINT22"], desc: "Comparator + / PWM Timer 0A" },
            { n: 13, name: "PD7", type: "IO", func: ["AIN1", "PCINT23"], desc: "Comparator -" },
            { n: 14, name: "PB0", type: "IO", func: ["CLKO", "ICP1", "PCINT0"], desc: "Clock Out / Input Capture" },

            // RIGHT SIDE (DIP Counts U-shape up right)
            { n: 15, name: "PB1", type: "IO", func: ["OC1A", "PCINT1"], desc: "PWM Timer 1A" },
            { n: 16, name: "PB2", type: "IO", func: ["SS", "OC1B", "PCINT2"], desc: "SPI Slave Select / PWM 1B" },
            { n: 17, name: "PB3", type: "IO", func: ["MOSI", "OC2A", "PCINT3"], desc: "SPI MOSI / PWM 2A" },
            { n: 18, name: "PB4", type: "IO", func: ["MISO", "PCINT4"], desc: "SPI MISO" },
            { n: 19, name: "PB5", type: "IO", func: ["SCK", "PCINT5"], desc: "SPI Clock (LED Builtin)" },
            { n: 20, name: "AVCC", type: "POWER", func: [], desc: "Supply for ADC" },
            { n: 21, name: "AREF", type: "ANALOG", func: [], desc: "Analog Reference" },
            { n: 22, name: "GND", type: "POWER", func: [], desc: "Ground" },
            { n: 23, name: "PC0", type: "IO", func: ["ADC0", "PCINT8"], desc: "Analog Input 0" },
            { n: 24, name: "PC1", type: "IO", func: ["ADC1", "PCINT9"], desc: "Analog Input 1" },
            { n: 25, name: "PC2", type: "IO", func: ["ADC2", "PCINT10"], desc: "Analog Input 2" },
            { n: 26, name: "PC3", type: "IO", func: ["ADC3", "PCINT11"], desc: "Analog Input 3" },
            { n: 27, name: "PC4", type: "IO", func: ["ADC4", "SDA", "PCINT12"], desc: "Analog Input 4 / I2C SDA" },
            { n: 28, name: "PC5", type: "IO", func: ["ADC5", "SCL", "PCINT13"], desc: "Analog Input 5 / I2C SCL" },
        ]
    },

    "STM32F103C8 (BluePill)": {
        meta: {
            name: "STM32F103C8T6",
            package: "LQFP-48",
            datasheet: "https://www.st.com/resource/en/datasheet/stm32f103c8.pdf",
            description: "Mainstream ARM Cortex-M3 MCU with 64KB Flash, 20KB RAM."
        },
        pins: [
            // Side 1 (Left, Top->Down) 1-12
            { n: 1, name: "VBAT", type: "POWER", func: [], desc: "RTC Battery Backup" },
            { n: 2, name: "PC13", type: "IO", func: ["TAMPER", "LED"], desc: "Builtin LED (Active Low)" },
            { n: 3, name: "PC14", type: "IO", func: ["OSC32_IN"], desc: "LSE Oscillator In" },
            { n: 4, name: "PC15", type: "IO", func: ["OSC32_OUT"], desc: "LSE Oscillator Out" },
            { n: 5, name: "PD0", type: "IO", func: ["OSC_IN"], desc: "HSE Oscillator In" },
            { n: 6, name: "PD1", type: "IO", func: ["OSC_OUT"], desc: "HSE Oscillator Out" },
            { n: 7, name: "NRST", type: "RESET", func: [], desc: "Reset Input (Active Low)" },
            { n: 8, name: "VSSA", type: "POWER", func: [], desc: "Analog Ground" },
            { n: 9, name: "VDDA", type: "POWER", func: [], desc: "Analog Power +3.3V" },
            { n: 10, name: "PA0", type: "IO", func: ["ADC0", "TIM2_CH1", "U2_CTS", "WKUP"], desc: "Wakeup Pin" },
            { n: 11, name: "PA1", type: "IO", func: ["ADC1", "TIM2_CH2", "U2_RTS"], desc: "" },
            { n: 12, name: "PA2", type: "IO", func: ["ADC2", "TIM2_CH3", "U2_TX"], desc: "USART2 TX" },

            // Side 2 (Bottom, Left->Right) 13-24
            { n: 13, name: "PA3", type: "IO", func: ["ADC3", "TIM2_CH4", "U2_RX"], desc: "USART2 RX" },
            { n: 14, name: "PA4", type: "IO", func: ["ADC4", "SPI1_SS", "DAC1"], desc: "SPI1 CS" },
            { n: 15, name: "PA5", type: "IO", func: ["ADC5", "SPI1_SCK", "DAC2"], desc: "SPI1 SCK" },
            { n: 16, name: "PA6", type: "IO", func: ["ADC6", "SPI1_MISO", "TIM3_CH1"], desc: "SPI1 MISO" },
            { n: 17, name: "PA7", type: "IO", func: ["ADC7", "SPI1_MOSI", "TIM3_CH2", "PWM"], desc: "SPI1 MOSI" },
            { n: 18, name: "PB0", type: "IO", func: ["ADC8", "TIM3_CH3", "PWM"], desc: "" },
            { n: 19, name: "PB1", type: "IO", func: ["ADC9", "TIM3_CH4", "PWM"], desc: "" },
            { n: 20, name: "PB2", type: "IO", func: ["BOOT1"], desc: "Boot Config 1" },
            { n: 21, name: "PB10", type: "IO", func: ["I2C2_SCL", "U3_TX"], desc: "I2C2 SCL / USART3 TX" },
            { n: 22, name: "PB11", type: "IO", func: ["I2C2_SDA", "U3_RX"], desc: "I2C2 SDA / USART3 RX" },
            { n: 23, name: "VSS", type: "POWER", func: [], desc: "Ground" },
            { n: 24, name: "VDD", type: "POWER", func: [], desc: "Main Power +3.3V" },

            // Side 3 (Right, Bottom->Top) 25-36
            { n: 25, name: "PB12", type: "IO", func: ["SPI2_SS", "I2C2_SMBA", "TIM1_BKIN"], desc: "SPI2 CS" },
            { n: 26, name: "PB13", type: "IO", func: ["SPI2_SCK", "TIM1_CH1N"], desc: "SPI2 SCK" },
            { n: 27, name: "PB14", type: "IO", func: ["SPI2_MISO", "TIM1_CH2N"], desc: "SPI2 MISO" },
            { n: 28, name: "PB15", type: "IO", func: ["SPI2_MOSI", "TIM1_CH3N"], desc: "SPI2 MOSI" },
            { n: 29, name: "PA8", type: "IO", func: ["U1_CK", "TIM1_CH1", "MCO"], desc: "Clock Output" },
            { n: 30, name: "PA9", type: "IO", func: ["U1_TX", "TIM1_CH2"], desc: "USART1 TX" },
            { n: 31, name: "PA10", type: "IO", func: ["U1_RX", "TIM1_CH3"], desc: "USART1 RX" },
            { n: 32, name: "PA11", type: "IO", func: ["U1_CTS", "USB_DM", "CAN_RX"], desc: "USB D-" },
            { n: 33, name: "PA12", type: "IO", func: ["U1_RTS", "USB_DP", "CAN_TX"], desc: "USB D+" },
            { n: 34, name: "PA13", type: "IO", func: ["SWDIO"], desc: "SWD Debug Data" },
            { n: 35, name: "VSS", type: "POWER", func: [], desc: "Ground" },
            { n: 36, name: "VDD", type: "POWER", func: [], desc: "Main Power +3.3V" },

            // Side 4 (Top, Right->Left) 37-48
            { n: 37, name: "PA14", type: "IO", func: ["SWCLK"], desc: "SWD Debug Clock" },
            { n: 38, name: "PA15", type: "IO", func: ["SPI1_SS", "JTDI"], desc: "JTAG DI" },
            { n: 39, name: "PB3", type: "IO", func: ["SPI1_SCK", "JTDO"], desc: "JTAG DO" },
            { n: 40, name: "PB4", type: "IO", func: ["SPI1_MISO", "NJTRST"], desc: "JTAG Reset" },
            { n: 41, name: "PB5", type: "IO", func: ["I2C1_SMBA", "SPI1_MOSI"], desc: "" },
            { n: 42, name: "PB6", type: "IO", func: ["I2C1_SCL", "TIM4_CH1", "U1_TX"], desc: "I2C1 SCL" },
            { n: 43, name: "PB7", type: "IO", func: ["I2C1_SDA", "TIM4_CH2", "U1_RX"], desc: "I2C1 SDA" },
            { n: 44, name: "BOOT0", type: "BOOT", func: [], desc: "Boot Mode Select" },
            { n: 45, name: "PB8", type: "IO", func: ["TIM4_CH3", "I2C1_SCL", "CAN_RX"], desc: "" },
            { n: 46, name: "PB9", type: "IO", func: ["TIM4_CH4", "I2C1_SDA", "CAN_TX"], desc: "" },
            { n: 47, name: "VSS", type: "POWER", func: [], desc: "Ground" },
            { n: 48, name: "VDD", type: "POWER", func: [], desc: "Main Power +3.3V" },
        ]
    }
};
