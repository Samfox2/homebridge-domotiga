# homebridge-domotiga
Supports domotiga devices on HomeBridge Platform
At this time, only a combined temperature/hygrometer sensor with the following configuration is suported.

domotiga device values:

1. = temperature,
2. = humidity,
3. = dewpoint (not used here),
4. = battery

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install git+https://github.com/Samfox2/homebridge-domotiga.git
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
