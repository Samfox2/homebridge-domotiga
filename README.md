# homebridge-domotiga
Supports domotiga devices on HomeBridge Platform

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-domotiga
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
"accessories": [
          {
            "accessory": "DomotigaTempHygroMeter",
            "name": "Sensor garden",
            "host": "localhost",
            "port": "9090",
            "device": "81",
            "lowbattery": "3000"
        }
    ]
```
