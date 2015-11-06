# homebridge-domotiga
Supports domotiga devices on HomeBridge Platform
At this time, only a combined temperature/hygrometer sensor is suported with:

domotiga device:
value 1 = temperature,
value 2 = humidity,
value 3 = dewpoint (not used here),
value 4 = battery,

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
